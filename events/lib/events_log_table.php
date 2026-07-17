<?php

namespace Soli\Events;

class EventsLogTableHandler {
  private $wpdb;
  private $charset;

  private $log_table;
  private $post_table;
  private $users_table;

  function __construct() {
    global $wpdb;
    $this->wpdb = $wpdb;
    $this->charset = $wpdb->get_charset_collate();
    $this->log_table = $wpdb->prefix . "event_dates_log";
    $this->post_table = $wpdb->prefix . "posts";
    $this->users_table = $wpdb->users;
  }

  function createEventLogTable() {
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta("CREATE TABLE $this->log_table (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        post_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        before_json longtext,
        after_json longtext,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY post_user_updated (post_id,user_id,updated_at)
    ) $this->charset;");
  }

  function dropEventLogTable() {
    $this->wpdb->query("DROP TABLE IF EXISTS $this->log_table");
  }

  /**
   * Record one change, aggregated per editing session. A save within the idle
   * window extends the open entry for the same post and user: before_json
   * stays at the session start, after_json moves forward with every save. The
   * first save after the window (or by another user) starts a new entry, so
   * the log reads as "state when the session began -> state when it ended".
   * A session whose net effect is zero (the user undid everything and saved)
   * is removed again.
   */
  function logChange($post_id, $user_id, $before, $after) {
    $before = $this->normalize($before);
    $after = $this->normalize($after);
    if ($before == $after) {
      return;
    }

    $window = apply_filters('soli_event_log_idle_window', HOUR_IN_SECONDS);
    $now_ts = current_time('timestamp');
    $now = date('Y-m-d H:i:s', $now_ts);
    $threshold = date('Y-m-d H:i:s', $now_ts - $window);

    $open = $this->wpdb->get_row($this->wpdb->prepare("
        SELECT id, before_json FROM $this->log_table
        WHERE post_id = %d AND user_id = %d AND updated_at >= %s
        ORDER BY updated_at DESC LIMIT 1",
      $post_id, $user_id, $threshold));

    if ($open) {
      $sessionBefore = $this->normalize(json_decode($open->before_json, true));
      if ($sessionBefore == $after) {
        $this->wpdb->delete($this->log_table, array('id' => $open->id));
        return;
      }
      $this->wpdb->update($this->log_table,
        array('after_json' => wp_json_encode($after), 'updated_at' => $now),
        array('id' => $open->id));
      return;
    }

    $this->wpdb->insert($this->log_table, array(
      'post_id' => $post_id,
      'user_id' => $user_id,
      'before_json' => wp_json_encode($before),
      'after_json' => wp_json_encode($after),
      'created_at' => $now,
      'updated_at' => $now,
    ));
  }

  function getRecentLogs($limit = 50) {
    return $this->wpdb->get_results($this->wpdb->prepare("
        SELECT l.id, l.post_id, l.user_id, l.before_json, l.after_json,
               l.created_at, l.updated_at,
               p.post_title, u.display_name
        FROM $this->log_table l
        LEFT JOIN $this->post_table p ON l.post_id = p.ID
        LEFT JOIN $this->users_table u ON l.user_id = u.ID
        ORDER BY l.updated_at DESC
        LIMIT %d", $limit), ARRAY_A);
  }

  // Snapshots are compared with == to detect no-op sessions; sort by row id so
  // row order (which setDatesAtEvent's delete/insert cycle does not guarantee)
  // can never make identical states look different.
  private function normalize($dates) {
    if (!is_array($dates)) {
      return array();
    }
    usort($dates, function ($a, $b) {
      return ($a['id'] ?? 0) <=> ($b['id'] ?? 0);
    });
    return array_values($dates);
  }
}
