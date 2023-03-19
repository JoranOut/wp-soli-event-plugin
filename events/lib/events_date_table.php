<?php

namespace Soli\Events;

class EventsDatesTableHandler {
  private $charset;
  private $wpdb;
  /**
   * @var string
   */
  private $tablename;
  private $meta_table;
  private $post_table;

  function __construct() {
    global $wpdb;
    $this->wpdb = $wpdb;
    $this->charset = $wpdb->get_charset_collate();
    $this->tablename = $wpdb->prefix . "event_dates";
    $this->meta_table = $wpdb->prefix . "postmeta";
    $this->post_table = $wpdb->prefix . "posts";
  }

  function createTable() {
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta("CREATE TABLE $this->tablename (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        parent bigint(20) unsigned,
        post_id bigint(20) unsigned NOT NULL,
        date datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        start_time TIME,
        end_time TIME,
        PRIMARY KEY  (id)
    ) $this->charset;");
  }

  function getDatesForMonth($yearmonth){
    if (empty($yearmonth)){
      return null;
    }

    $year = $yearmonth->format( 'Y' );
    $month = $yearmonth->format( 'm' );

    return $this->loadMonthEventsFromDb($year, $month);
  }

  function loadMonthEventsFromDb($year, $month) {
    $query = $this->wpdb->prepare("SELECT d.id, d.parent, d.date, d.start_time, d.end_time, 
       p.start_time as parent_start_time, p.end_time as parent_end_time, m.meta_value as featured_image_id,
       w.ID , w.post_author , w.post_title , w.post_excerpt , w.post_status , w.post_name , w.post_modified , w.post_parent , w.post_type 
        FROM $this->tablename d
        LEFT JOIN $this->tablename p
            ON d.parent = p.id 
        LEFT JOIN wp_posts w 
            ON d.post_id = w.id 
        LEFT JOIN $this->meta_table m 
            ON d.post_id = w.id and m.meta_key = '_thumbnail_id'
        WHERE YEAR(d.date) = %d AND MONTH(d.date) = %d 
              and w.post_status = %s;", $year, $month, 'publish');
    return $this->wpdb->get_results($query, ARRAY_A);
  }


  function getDatesFromEvent($event_id) {
    $dates = $this->loadEventDatesFromDb($event_id);
    if (empty($dates)){
      return null;
    }
    foreach($dates as $date){
       if ($date["parent"] == 0){
         $main = $date;
       } else {
         $repeated[] = $date;
       }
    }
    return (object)[
      "main" => $main,
      "repeated" => $repeated
    ];
  }

  function loadEventDatesFromDb($event_id) {
    $query = $this->wpdb->prepare("
                SELECT d.id, d.parent, d.date, d.start_time, d.end_time, p.start_time as parent_start_time, p.end_time as parent_end_time 
                FROM $this->tablename d
                LEFT JOIN $this->tablename p
                ON d.parent = p.id
                WHERE d.post_id=$event_id");
    return $this->wpdb->get_results($query, ARRAY_A);
  }

  function getEventsBetweenDates($from, $to){
    if (empty($from) || empty($to)){
      return null;
    }

    return $this->loadAllBetweenDatesEventDatesFromDb($from, $to);
  }

  function loadAllBetweenDatesEventDatesFromDb($from, $to) {
    $startDate = $from->format('Y-m-d');
    $endDate = $to->format('Y-m-d');
    $query = $this->wpdb->prepare("SELECT d.id, d.parent, d.date, d.start_time, d.end_time, 
       p.start_time as parent_start_time, p.end_time as parent_end_time,
       w.ID , w.post_author , w.post_title , w.post_excerpt , w.post_status , w.post_name , w.post_modified , w.post_parent , w.guid , w.post_type 
        FROM $this->tablename d
        LEFT JOIN $this->tablename p
            ON d.parent = p.id 
        LEFT JOIN $this->post_table w 
            ON d.post_id = w.id 
        WHERE d.date between %s and %s
              and w.post_status = %s;", $startDate, $endDate, 'publish');
    var_dump($query);
    return $this->wpdb->get_results($query, ARRAY_A);
  }

  function setDatesAtEvent($event_id, $dates) {
    if (!$this->validateDates($dates)) {
      return false;
    }
    $this->removeRedundantDates($event_id, $dates);
    $main_id = $this->saveDate($event_id, $dates->main);
    if ($dates->repeated) {
      foreach ($dates->repeated as $date) {
        $this->saveDate($event_id, $date, $main_id);
      }
    }
    return $this->getDatesFromEvent($event_id);
  }

  function removeRedundantDates($event_id, $dates){
    $nonRedundant = array();
    if ($dates->repeated) {
      $nonRedundant = array_merge($nonRedundant, array_column($dates->repeated, 'id'));
    }
    if (isset($dates->main->id)){
      $nonRedundant[] = $dates->main->id;
    }
    if(empty($nonRedundant)){
      $query = $this->wpdb->prepare("
                          DELETE FROM $this->tablename
                              WHERE post_id = %d",
        $event_id
      );
    } else {
      $query = $this->wpdb->prepare("
                          DELETE FROM $this->tablename
                              WHERE post_id = %d 
                              AND id NOT IN (".implode(',',$nonRedundant).");",
        $event_id
      );
    }
    $this->wpdb->get_results($query, ARRAY_A);
  }

  function saveDate($event_id, $date, $parent_id = null) {
    if (empty($date->id)) {
      $query = $this->wpdb->prepare("
                        INSERT INTO $this->tablename 
                            (parent, post_id, date, start_time, end_time) VALUES 
                            (%d, %d, %s, %s, %s)",
        $parent_id,
        $event_id,
        $date->date,
        $date->start_time ?: 'NULL',
        $date->end_time ?: 'NULL'
      );

      $this->wpdb->get_results($this->replaceNullWithNull($query), ARRAY_A);
      return $this->wpdb->insert_id;
    } else {
      $query = $this->wpdb->prepare("
                        UPDATE $this->tablename 
                        SET date = %s,
                            start_time = %s,
                            end_time = %s
                        WHERE id=%d;",
        $date->date,
        $date->start_time ?: 'NULL',
        $date->end_time ?: 'NULL',
        $date->id
      );

      $this->wpdb->get_results($this->replaceNullWithNull($query), ARRAY_A);
      return $date->id;
    }
  }

  function validateDates($dates) {
    if (!$this->validateDate($dates->main)) {
      return false;
    }
    if ($dates->repeated) {
      foreach ($dates->repeated as $date) {
        if (!$this->validateDate($date)) {
          return false;
        }
      }
    }
    return true;
  }

  function validateDate($date) {
    return isset($date)
      && is_string($date->date);
  }

  function replaceNullWithNull($query){
    return str_replace("'NULL'","NULL", $query);
  }
}

