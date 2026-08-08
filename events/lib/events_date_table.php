<?php

namespace Soli\Events;

class EventsDatesTableHandler {
  private $charset;
  private $wpdb;

  private $event_dates_table;
  private $event_location_table;
  private $meta_table;
  private $post_table;

  function __construct() {
    global $wpdb;
    $this->wpdb = $wpdb;
    $this->charset = $wpdb->get_charset_collate();
    $this->event_dates_table = $wpdb->prefix . "event_dates";
    $this->event_location_table = $wpdb->prefix . "event_location";
    $this->meta_table = $wpdb->prefix . "postmeta";
    $this->post_table = $wpdb->prefix . "posts";
  }

  function createEventTable() {
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta("CREATE TABLE $this->event_dates_table (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        post_id bigint(20) unsigned NOT NULL,
        start_date datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_date datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        location bigint(20) unsigned,
        rooms TINYTEXT,
        status TINYTEXT NOT NULL DEFAULT 'PLANNED',
        notes TEXT,
        admin_notes TEXT,
        is_concert BOOLEAN NOT NULL DEFAULT 0,
        PRIMARY KEY  (id)
    ) $this->charset;");
  }

  function dropEventTable() {
    global $wpdb;
    $sql = "DROP TABLE IF EXISTS $this->event_dates_table";
    $wpdb->query($sql);
  }

  function getDatesFromEvent($event_id) {
    $dates = $this->loadEventDatesFromDb($event_id);
    if (empty($dates)) {
      return null;
    }
    return $dates;
  }

  // Returns the next upcoming event date. By default it only considers dates
  // flagged as concerts, matching the original behaviour. Pass $args to relax
  // or narrow the selection:
  //   - only_concerts (bool, default true): when false, any event date qualifies
  //   - category_id   (int, default 0):     when set, restrict to events in that category
  function getNextConcert($args = array()) {
    $only_concerts = array_key_exists('only_concerts', $args) ? (bool) $args['only_concerts'] : true;
    $category_id   = isset($args['category_id']) ? absint($args['category_id']) : 0;
    $current_daytime = current_time('Y-m-d H:i:s');

    $term_relationships_table = $this->wpdb->prefix . 'term_relationships';
    $term_taxonomy_table      = $this->wpdb->prefix . 'term_taxonomy';

    $joins  = '';
    $where  = 'WHERE w.post_status = %s and d.end_date >= %s';
    $params = array('publish', $current_daytime);
    // Date-status visibility is viewer-dependent (F4/F7): public viewers see
    // PUBLIC + PRIVATE (PRIVATE title masked by the block), editors see all.
    $where .= ' and ' . EventVisibility::statusInClause('d', $params);

    if ($only_concerts) {
      $where .= ' and d.is_concert = 1';
    }

    if ($category_id) {
      $joins .= " INNER JOIN $term_relationships_table tr ON tr.object_id = w.ID
        INNER JOIN $term_taxonomy_table tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy = 'category'";
      $where  .= ' and tt.term_id = %d';
      $params[] = $category_id;
    }

    $sql = "
        SELECT d.id, d.start_date, d.end_date, d.rooms, d.status, d.notes, d.is_concert,
               m.meta_value as featured_image_id,
           w.ID as post_id, w.post_title, w.post_status, w.post_name,
           l.id as location_id, l.name as location_name, l.address as location_address
        FROM $this->event_dates_table d
        LEFT JOIN $this->post_table w
            ON d.post_id = w.id
        LEFT JOIN $this->meta_table m
            ON m.post_id = w.id and m.meta_key = '_thumbnail_id'
        LEFT JOIN $this->event_location_table l
            on d.location = l.id
        $joins
        $where
        ORDER BY d.start_date asc LIMIT 1";

    $query = $this->wpdb->prepare($sql, $params);
    $concert = $this->wpdb->get_row($query, ARRAY_A);
    if (empty($concert)) {
      return null;
    }

    $concert['is_concert'] = (bool) $concert['is_concert'];
    $concert['post_excerpt'] = get_the_excerpt($concert['post_id']);
    if (!empty($concert['featured_image_id'])) {
      $img = wp_get_attachment_image_src($concert['featured_image_id'], 'full');
      if ($img) {
        $concert['featured_image'] = $img[0];
      }
    }
    return $concert;
  }

  // Upcoming dates for a single event, ordered by start date. Used by the
  // soli/event-dates block to show the event's own recurrence schedule, so it
  // returns every future date of the event regardless of status. Pass a $limit
  // to cap the number of rows.
  function getUpcomingDatesForEvent($event_id, $limit = null) {
    $event_id = absint($event_id);
    if (!$event_id) {
      return array();
    }

    $current_daytime = current_time('Y-m-d H:i:s');
    // Filter dates by the viewer's allowed statuses (F1): public viewers see
    // PUBLIC + PRIVATE, editors see workflow states too.
    $params = array($event_id);
    $status_clause = EventVisibility::statusInClause('d', $params);
    $params[] = $current_daytime;
    $sql = "
        SELECT d.id, d.start_date, d.end_date, d.rooms, d.status, d.notes, d.is_concert,
               l.id as location_id, l.name as location_name, l.address as location_address
        FROM $this->event_dates_table d
        LEFT JOIN $this->event_location_table l
            on d.location = l.id
        WHERE d.post_id = %d and $status_clause and d.end_date >= %s
        ORDER BY d.start_date asc";

    if ($limit !== null) {
      $sql .= " LIMIT %d";
      $params[] = absint($limit);
    }
    $query = $this->wpdb->prepare($sql, $params);

    $results = $this->wpdb->get_results($query, ARRAY_A);
    return $this->castIsConcertToBoolean($results);
  }

  // All upcoming PUBLIC dates for the iCal feed (/ical). Strictly PUBLIC only
  // (PRIVATE and workflow states are excluded from the exported feed) on
  // published events.
  //
  // The category ids and the concerts flag form a single OR group: pass one or
  // more category term ids (an event matches if it is in ANY of them) and/or
  // set $concerts_only to also include concert-flagged dates. When nothing is
  // selected (empty ids + false), the whole public agenda is returned.
  function getPublicFutureDatesForFeed($category_ids = array(), $concerts_only = false) {
    $now = current_time('Y-m-d H:i:s');

    // Normalise to a list of positive, unique term ids (scalar accepted for BC).
    $category_ids = array_values(array_unique(array_filter(
      array_map('absint', (array) $category_ids)
    )));

    $where  = 'WHERE w.post_status = %s AND d.status = %s AND d.end_date >= %s';
    $params = array('publish', EventVisibility::STATUS_PUBLIC, $now);

    // Build the OR filter group from the concerts flag + category membership.
    // Categories use an IN (SELECT ...) subquery (not a join) so it composes
    // with the concerts condition without producing duplicate date rows.
    $or = array();
    if ($concerts_only) {
      $or[] = 'd.is_concert = 1';
    }
    if ($category_ids) {
      $term_relationships_table = $this->wpdb->prefix . 'term_relationships';
      $term_taxonomy_table      = $this->wpdb->prefix . 'term_taxonomy';
      $placeholders = implode(', ', array_fill(0, count($category_ids), '%d'));
      $or[] = "w.ID IN (
          SELECT tr.object_id
          FROM $term_relationships_table tr
          INNER JOIN $term_taxonomy_table tt
            ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy = 'category'
          WHERE tt.term_id IN ($placeholders)
      )";
      $params = array_merge($params, $category_ids);
    }
    if ($or) {
      $where .= ' AND (' . implode(' OR ', $or) . ')';
    }

    $sql = "
        SELECT d.id, d.start_date, d.end_date, d.rooms, d.notes,
           w.ID as post_id, w.post_title, w.post_content, w.post_excerpt, w.post_modified_gmt,
           l.name as location_name, l.address as location_address
        FROM $this->event_dates_table d
        LEFT JOIN $this->post_table w
            ON d.post_id = w.id
        LEFT JOIN $this->event_location_table l
            on d.location = l.id
        $where
        ORDER BY d.start_date asc";

    return $this->wpdb->get_results($this->wpdb->prepare($sql, $params), ARRAY_A);
  }

  // Categories assigned to published events, for the calendar-subscribe block.
  // Returns [{term_id, name, slug}] ordered by name; only categories actually
  // used by a published soli_event appear (empty ones are hidden).
  function getFeedCategories() {
    $terms_table              = $this->wpdb->prefix . 'terms';
    $term_taxonomy_table      = $this->wpdb->prefix . 'term_taxonomy';
    $term_relationships_table = $this->wpdb->prefix . 'term_relationships';

    $sql = "
        SELECT DISTINCT t.term_id, t.name, t.slug
        FROM $terms_table t
        INNER JOIN $term_taxonomy_table tt
            ON tt.term_id = t.term_id AND tt.taxonomy = 'category'
        INNER JOIN $term_relationships_table tr
            ON tr.term_taxonomy_id = tt.term_taxonomy_id
        INNER JOIN $this->post_table p
            ON p.ID = tr.object_id AND p.post_type = %s AND p.post_status = %s
        ORDER BY t.name ASC";

    return $this->wpdb->get_results($this->wpdb->prepare($sql, 'soli_event', 'publish'), ARRAY_A);
  }

  function getFutureDatesPerPageFromEvent($page, $itemsPerPage) {
    $dates = $this->loadFutureEventDatesPerPageFromDb($page, $itemsPerPage);
    if (empty($dates)) {
      return null;
    }
    return $this->appendExcerpt($dates);
  }

  function loadEventDatesFromDb($event_id) {
    $query = $this->wpdb->prepare("
                SELECT d.id, d.start_date, d.end_date, d.rooms, d.status, d.notes, d.admin_notes, d.is_concert,
                       l.id as location_id, l.name as location_name, l.address as location_address
                FROM $this->event_dates_table d
                LEFT JOIN $this->event_location_table l
                    on d.location = l.id
                WHERE d.post_id = %d", $event_id);
    $results = $this->wpdb->get_results($query, ARRAY_A);
    return $this->castIsConcertToBoolean($results);
  }

  function loadFutureEventDatesPerPageFromDb($page, $itemsPerPage) {
    $offset = ($page - 1) * $itemsPerPage;
    $limit = $itemsPerPage;
    $current_daytime = current_time('Y-m-d H:m:s');

    // Viewer-aware date-status filter + PRIVATE title masking (F4/F7).
    $title_expr = EventVisibility::titleSelectExpr('d', 'w.post_title');
    $params = array('publish');
    $status_clause = EventVisibility::statusInClause('d', $params);
    $params[] = $current_daytime;
    $params[] = $limit;
    $params[] = $offset;
    $query = $this->wpdb->prepare("
        SELECT d.id, d.start_date, d.end_date, d.rooms, d.status, d.notes, d.is_concert,
               m.meta_value as featured_image_id,
           w.ID as post_id, w.post_author, $title_expr AS post_title,
           w.post_status, w.post_name, w.post_modified, w.post_parent, w.guid, w.post_type,
           l.id as location_id, l.name as location_name, l.address as location_address
        FROM $this->event_dates_table d
        LEFT JOIN $this->post_table w
            ON d.post_id = w.id
        LEFT JOIN $this->meta_table m
            ON m.post_id = w.id and m.meta_key = '_thumbnail_id'
        LEFT JOIN $this->event_location_table l
            on d.location = l.id
        WHERE w.post_status = %s and $status_clause and d.end_date >= %s
        ORDER BY d.start_date asc LIMIT %d OFFSET %d", $params);
    $results = $this->wpdb->get_results($query, ARRAY_A);
    $results = $this->appendGUID($results);
    return $this->castIsConcertToBoolean($results);
  }

  function getTotalFutureEvents() {
      $current_daytime = current_time('Y-m-d H:m:s');

      // Must mirror loadFutureEventDatesPerPageFromDb's filter so pagination
      // totals match the rows actually returned.
      $params = array('publish');
      $status_clause = EventVisibility::statusInClause('d', $params);
      $params[] = $current_daytime;
      $query = $this->wpdb->prepare("
        SELECT COUNT(*)
        FROM $this->event_dates_table d
        LEFT JOIN $this->post_table w ON d.post_id = w.id
        WHERE w.post_status = %s AND $status_clause AND d.end_date >= %s
    ", $params);

      return (int) $this->wpdb->get_var($query);
  }

  function getEventsBetweenDates($from, $to) {
    if (empty($from) || empty($to)) {
      return null;
    }

    return $this->loadAllBetweenDatesEventDatesFromDb($from, $to);
  }

  function loadAllBetweenDatesEventDatesFromDb($from, $to) {
    $startDate = $from->format('Y-m-d');
    $endDate = $to->format('Y-m-d');
    // Viewer-aware masking + date-status filter (F4/F7). Any date in range shows
    // (past included); PRIVATE title masked only for not-logged-in visitors.
    $title_expr = EventVisibility::titleSelectExpr('d', 'w.post_title');
    $params = array($startDate, $endDate, $startDate, $endDate, 'publish');
    $status_clause = EventVisibility::statusInClause('d', $params);
    $query = $this->wpdb->prepare("SELECT d.id, d.start_date, d.end_date, d.rooms, d.status, d.notes, d.is_concert,
       w.ID , w.post_author ,
       $title_expr AS post_title,
       w.post_status , w.post_name , w.post_modified , w.post_parent , w.guid , w.post_type,
       l.id as location_id, l.name as location_name, l.address as location_address
        FROM $this->event_dates_table d
        LEFT JOIN $this->post_table w
            ON d.post_id = w.id
        LEFT JOIN $this->event_location_table l
            on d.location = l.id
        WHERE ((d.start_date between %s and %s) or (d.end_date between %s and %s))
              and w.post_status = %s
              and $status_clause;", $params);
    $results = $this->wpdb->get_results($query, ARRAY_A);
    $results = $this->appendGUID($results);
    return $this->castIsConcertToBoolean($results);
  }

  function setDatesAtEvent($event_id, $dates) {
    if (!$this->validateDates($dates)) {
      return false;
    }
    $this->removeRedundantDates($event_id, $dates);
    if ($dates) {
      foreach ($dates as $date) {
        $this->saveDate($event_id, $date);
      }
    }
    return $this->getDatesFromEvent($event_id);
  }

  function removeRedundantDates($post_id, $dates) {
    $nonRedundant = array();
    if ($dates) {
      // Cast every id to int before it reaches the SQL string: these ids come
      // from the request body and are interpolated (not bound) into the IN clause.
      $nonRedundant = array_filter(array_map('intval', array_column($dates, 'id')));
    }
    if (empty($nonRedundant)) {
      $query = $this->wpdb->prepare("
                          DELETE FROM $this->event_dates_table
                              WHERE post_id = %d",
        $post_id
      );
    } else {
      $query = $this->wpdb->prepare("
                          DELETE FROM $this->event_dates_table
                              WHERE post_id = %d
                              AND id NOT IN (" . implode(',', $nonRedundant) . ");",
        $post_id
      );
    }
    $this->wpdb->get_results($query, ARRAY_A);
  }

  function saveDate($event_id, $date) {
    // Store real NULL when there are no rooms. json_encode(null) would yield the
    // 4-char string "null", which readers then mistake for a rooms value (e.g.
    // the admin table would print "null" instead of the named location).
    $roomSlugs = Values\roomIndexesToSlugs($date->rooms);
    $roomsJson = empty($roomSlugs) ? null : json_encode($roomSlugs);
    $canEditAdminNotes = current_user_can('soli_event_admin_notes');

    $data = array(
      'start_date'  => $date->start_date,
      'end_date'    => $date->end_date,
      'location'    => $date->location ?? null,
      'rooms'       => $roomsJson,
      'status'      => $date->status ?? null,
      'notes'       => $date->notes ?? null,
      'is_concert'  => $date->is_concert ? 1 : 0,
    );

    if (empty($date->id)) {
      // A brand new date can only be created by a user editing the event, so
      // admin_notes may be set directly (it is capability-gated on read anyway).
      $data['post_id']     = $event_id;
      $data['admin_notes'] = $canEditAdminNotes ? ($date->admin_notes ?? null) : null;
      $this->wpdb->insert($this->event_dates_table, $data);
      return $this->wpdb->insert_id;
    }

    // Users without the capability must never overwrite existing admin notes:
    // keep whatever is already stored.
    if ($canEditAdminNotes) {
      $data['admin_notes'] = $date->admin_notes ?? null;
    } else {
      $data['admin_notes'] = $this->wpdb->get_var(
        $this->wpdb->prepare("SELECT admin_notes FROM $this->event_dates_table WHERE id = %d", $date->id)
      );
    }

    $this->wpdb->update($this->event_dates_table, $data, array('id' => $date->id));
    return $date->id;
  }

  function validateDates($dates): bool {
    foreach ($dates as $date) {
      if (!$this->validateDate($date)) {
        return false;
      }
    }
    return true;
  }

  function validateDate($date): bool {
    return isset($date)
      && is_string($date->start_date)
      && is_string($date->end_date);
  }

  private function castIsConcertToBoolean($results) {
    return array_map(function($date) {
      $date['is_concert'] = (bool) $date['is_concert'];
      return $date;
    }, $results);
  }

  private function appendGUID($results) {
    return array_map(function($date) {
      $date['guid'] = html_entity_decode($date['guid'].'&event='.$date['id']);
      return $date;
    }, $results);
  }

  private function appendExcerpt($results) {
    return array_map(function($date) {
      $date['post_excerpt'] = get_the_excerpt($date['post_id']);
      return $date;
    }, $results);
  }
}
