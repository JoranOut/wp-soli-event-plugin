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

  function getNextConcert() {
    $current_daytime = current_time('Y-m-d H:i:s');

    $query = $this->wpdb->prepare("
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
        WHERE w.post_status = %s and d.status = %s and d.end_date >= %s and d.is_concert = 1
        ORDER BY d.start_date asc LIMIT 1", 'publish', 'public', $current_daytime);
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
    $sql = "
        SELECT d.id, d.start_date, d.end_date, d.rooms, d.status, d.notes, d.is_concert,
               l.id as location_id, l.name as location_name, l.address as location_address
        FROM $this->event_dates_table d
        LEFT JOIN $this->event_location_table l
            on d.location = l.id
        WHERE d.post_id = %d and d.end_date >= %s
        ORDER BY d.start_date asc";

    if ($limit !== null) {
      $query = $this->wpdb->prepare($sql . " LIMIT %d", $event_id, $current_daytime, absint($limit));
    } else {
      $query = $this->wpdb->prepare($sql, $event_id, $current_daytime);
    }

    $results = $this->wpdb->get_results($query, ARRAY_A);
    return $this->castIsConcertToBoolean($results);
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

    $query = $this->wpdb->prepare("
        SELECT d.id, d.start_date, d.end_date, d.rooms, d.status, d.notes, d.is_concert,
               m.meta_value as featured_image_id,
           w.ID as post_id, w.post_author, CASE d.status WHEN 'PRIVATE' THEN 'private' ELSE w.post_title END AS post_title,
           w.post_status, w.post_name, w.post_modified, w.post_parent, w.guid, w.post_type,
           l.id as location_id, l.name as location_name, l.address as location_address
        FROM $this->event_dates_table d
        LEFT JOIN $this->post_table w
            ON d.post_id = w.id
        LEFT JOIN $this->meta_table m
            ON m.post_id = w.id and m.meta_key = '_thumbnail_id'
        LEFT JOIN $this->event_location_table l
            on d.location = l.id
        WHERE w.post_status = %s and d.status = %s and d.end_date >= %s
        ORDER BY d.start_date asc LIMIT %d OFFSET %d", 'publish', 'public', $current_daytime, $limit, $offset);
    $results = $this->wpdb->get_results($query, ARRAY_A);
    $results = $this->appendGUID($results);
    return $this->castIsConcertToBoolean($results);
  }

  function getTotalFutureEvents() {
      $current_daytime = current_time('Y-m-d H:m:s');

      $query = $this->wpdb->prepare("
        SELECT COUNT(*) 
        FROM $this->event_dates_table d
        LEFT JOIN $this->post_table w ON d.post_id = w.id
        WHERE w.post_status = %s AND d.status = %s AND d.end_date >= %s
    ", 'publish', 'public', $current_daytime);

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
    $query = $this->wpdb->prepare("SELECT d.id, d.start_date, d.end_date, d.rooms, d.status, d.notes, d.is_concert,
       w.ID , w.post_author ,
       CASE d.status WHEN 'PRIVATE' THEN 'private' ELSE w.post_title END AS post_title,
       w.post_status , w.post_name , w.post_modified , w.post_parent , w.guid , w.post_type,
       l.id as location_id, l.name as location_name, l.address as location_address
        FROM $this->event_dates_table d
        LEFT JOIN $this->post_table w
            ON d.post_id = w.id
        LEFT JOIN $this->event_location_table l
            on d.location = l.id
        WHERE ((d.start_date between %s and %s) or (d.end_date between %s and %s))
              and w.post_status = %s
              and d.status in ('PUBLIC', 'PRIVATE');", $startDate, $endDate, $startDate, $endDate, 'publish');
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
