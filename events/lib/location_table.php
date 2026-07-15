<?php

namespace Soli\Events;

class LocationTableHandler {
  private $charset;
  private $wpdb;

  private $event_location_table;
  private $event_dates_table;
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

  function createLocationTable() {
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta("CREATE TABLE $this->event_location_table (
        id BIGINT(20) unsigned NOT NULL AUTO_INCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        PRIMARY KEY  (id)
    ) $this->charset;");
  }

  function dropLocationTable() {
    global $wpdb;
    $sql = "DROP TABLE IF EXISTS $this->event_location_table";
    $wpdb->query($sql);
  }

  function getLocationByEvent($event_id) {
    if (empty($event_id)) {
      return null;
    }
    return $this->loadLocationByEvent($event_id);
  }

  function loadLocationByEvent($event_id) {
    $query = $this->wpdb->prepare("
                SELECT l.id, l.name, l.address 
                FROM $this->event_location_table l
                LEFT JOIN $this->event_dates_table d
                ON l.id = d.location
                WHERE d.id=%d", $event_id);
    return $this->wpdb->get_results($query, ARRAY_A);
  }

  function searchLocation($search_query, $limit) {
    if (empty($search_query)) {
      return $this->searchLastUsedLocations($limit);
    }

    return $this->searchLocationByNameAndAddress($search_query, $limit) ?? [];
  }

  function searchLastUsedLocations($limit) {
    $query = $this->wpdb->prepare("
                SELECT l.id, l.name, l.address 
                FROM $this->event_location_table l
                LEFT JOIN $this->event_dates_table e
                ON l.id = e.location
                GROUP BY l.id
                ORDER BY e.start_date DESC
                LIMIT %d", $limit);
    return $this->wpdb->get_results($query, ARRAY_A);
  }

  function searchLocationByNameAndAddress($search_query, $limit) {
    $query = $this->wpdb->prepare("
                SELECT l.id, l.name, l.address 
                FROM $this->event_location_table l
                WHERE l.name like %s or l.address like %s
                LIMIT %d",
      '%'.$this->wpdb->esc_like($search_query).'%',
      '%'.$this->wpdb->esc_like($search_query).'%',
      $limit);
    return $this->wpdb->get_results($query, ARRAY_A);
  }

  function persistLocation($id, $location) {
    return $this->saveLocation((object)[
      "id" => $id,
      "name" => $location->name,
      "address" => $location->address
    ]);
  }

  function saveLocation($location) {
    // Let $wpdb emit a real NULL for an empty address; passing null through the
    // data array is what makes dbDelta-created nullable columns store NULL.
    $address = !empty($location->address) ? $location->address : null;

    if (empty($location->id)) {
      $this->wpdb->insert(
        $this->event_location_table,
        array(
          'name'    => $location->name,
          'address' => $address,
        )
      );
      $location->id = $this->wpdb->insert_id;
    } else {
      $this->wpdb->update(
        $this->event_location_table,
        array(
          'name'    => $location->name,
          'address' => $address,
        ),
        array('id' => $location->id)
      );
    }
    return $location;
  }

}

