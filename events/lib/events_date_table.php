<?php

namespace Soli\Events;

class EventsDatesTableCreation {
  function __construct() {
    global $wpdb;
    $this->charset = $wpdb->get_charset_collate();
    $this->tablename = $wpdb->prefix . "event_dates";
  }

  function onActivate() {
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta("CREATE TABLE $this->tablename (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        parent bigint(20) unsigned NOT NULL,
        post bigint(20) unsigned NOT NULL,
        date datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        start_time TIME,
        end_time TIME,
        PRIMARY KEY  (id)
    ) $this->charset;");
  }
}
