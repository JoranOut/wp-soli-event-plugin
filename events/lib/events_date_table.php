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

  function getFutureDatesPerPageFromEvent($page, $itemsPerPage) {
    $dates = $this->loadFutureEventDatesPerPageFromDb($page, $itemsPerPage);
    if (empty($dates)) {
      return null;
    }
    return $dates;
  }

  function loadEventDatesFromDb($event_id) {
    $query = $this->wpdb->prepare("
                SELECT d.id, d.start_date, d.end_date, d.rooms, d.status, d.notes, d.is_concert,
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

    $query = $this->wpdb->prepare(  "
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
        ORDER BY d.start_date desc LIMIT %d OFFSET %d ", 'publish', 'public', $current_daytime, $limit, $offset);
    $results = $this->wpdb->get_results($query, ARRAY_A);
    return $this->castIsConcertToBoolean($results);
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
              and w.post_status = %s;", $startDate, $endDate, $startDate, $endDate, 'publish');
    $results = $this->wpdb->get_results($query, ARRAY_A);
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
      $nonRedundant = array_merge($nonRedundant, array_column($dates, 'id'));
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
    $roomsJson = json_encode(Values\roomIndexesToSlugs($date->rooms));

    if (empty($date->id)) {
      $query = $this->wpdb->prepare("
                        INSERT INTO $this->event_dates_table
                            (post_id, start_date, end_date, location, rooms, status, notes, is_concert) VALUES
                            (%d, %s, %s, %s, %s, %s, %s, %d)",
        $event_id,
        $date->start_date,
        $date->end_date,
        $date->location ?: 'NULL',
        $roomsJson ?: 'NULL',
        $date->status,
        $date->notes,
        $date->is_concert ? 1 : 0
      );

      $this->wpdb->get_results($this->replaceNullWithNull($query), ARRAY_A);
      return $this->wpdb->insert_id;
    } else {
      $query = $this->wpdb->prepare("
                        UPDATE $this->event_dates_table
                        SET start_date = %s,
                            end_date = %s,
                            location = %s,
                            rooms = %s,
                            status = %s,
                            notes = %s,
                            is_concert = %d
                        WHERE id=%d;",
        $date->start_date,
        $date->end_date,
        $date->location ?: 'NULL',
        $roomsJson ?: 'NULL',
        $date->status,
        $date->notes,
        $date->is_concert ? 1 : 0,
        $date->id
      );

      $this->wpdb->get_results($this->replaceNullWithNull($query), ARRAY_A);
      return $date->id;
    }
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

  function replaceNullWithNull($query) {
    return str_replace("'NULL'", "NULL", $query);
  }

  private function castIsConcertToBoolean($results) {
    return array_map(function($date) {
      $date['is_concert'] = (bool) $date['is_concert'];
      return $date;
    }, $results);
  }
}
