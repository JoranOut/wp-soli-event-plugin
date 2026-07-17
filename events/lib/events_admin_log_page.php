<?php

namespace Soli\Events;

function soli_events_add_admin_log_page() {
  // Add submenu under the 'soli_event' post type menu
  add_submenu_page(
    'edit.php?post_type=soli_event', // Parent slug (links to Events menu)
    __('Log View', 'soli-event'),   // Page title
    __('Log View', 'soli-event'),   // Menu title
    'manage_options',               // Capability required to access
    'soli_event_admin_log',        // Menu slug
    'Soli\Events\soli_events_add_admin_log_page_content', // Callback function to render the page
    2
  );
}
add_action('admin_menu', 'Soli\Events\soli_events_add_admin_log_page');

function soli_events_add_admin_log_page_content() {
  if (!current_user_can('manage_options')) {
    wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'soli-event'));
  }
  ?>
    <div class="wrap">
        <h1><?php echo esc_html__('Log View', 'soli-event'); ?></h1>
        <p><?php echo esc_html__('Changes to event dates, aggregated per editing session: consecutive saves by the same user on the same event are combined into one entry until an hour of inactivity passes.', 'soli-event'); ?></p>

        <?php soli_events_render_log_table(); ?>
    </div>
  <?php
}

function soli_events_render_log_table() {
  $logs = (new EventsLogTableHandler())->getRecentLogs(50);

  echo '<table class="wp-list-table widefat fixed striped">';
  echo '<thead><tr>';
  echo '<th style="width:20%">' . esc_html__('Event', 'soli-event') . '</th>';
  echo '<th style="width:12%">' . esc_html__('User', 'soli-event') . '</th>';
  echo '<th>' . esc_html__('Changes', 'soli-event') . '</th>';
  echo '<th style="width:12%">' . esc_html__('First change', 'soli-event') . '</th>';
  echo '<th style="width:12%">' . esc_html__('Last change', 'soli-event') . '</th>';
  echo '</tr></thead>';
  echo '<tbody>';

  if (empty($logs)) {
    echo '<tr><td colspan="5">' . esc_html__('No changes have been logged yet.', 'soli-event') . '</td></tr>';
  }

  foreach ($logs as $log) {
    $title = $log['post_title'] !== null && $log['post_title'] !== ''
      ? $log['post_title']
      : __('(deleted event)', 'soli-event');
    $user = $log['display_name'] !== null && $log['display_name'] !== ''
      ? $log['display_name']
      : __('(unknown user)', 'soli-event');
    $edit_link = get_edit_post_link($log['post_id']);

    echo '<tr>';
    echo '<td>';
    if ($edit_link) {
      echo '<a href="' . esc_url($edit_link) . '">' . esc_html($title) . '</a>';
    } else {
      echo esc_html($title);
    }
    echo '</td>';
    echo '<td>' . esc_html($user) . '</td>';
    echo '<td>' . soli_events_render_log_diff($log['before_json'], $log['after_json']) . '</td>';
    echo '<td>' . esc_html($log['created_at']) . '</td>';
    echo '<td>' . esc_html($log['updated_at']) . '</td>';
    echo '</tr>';
  }

  echo '</tbody></table>';
}

/**
 * Render a compact human-readable diff between the session's before and after
 * snapshots (arrays of event_dates rows keyed by row id). Returns escaped HTML.
 */
function soli_events_render_log_diff($before_json, $after_json) {
  $before = soli_events_index_dates_by_id(json_decode($before_json, true));
  $after = soli_events_index_dates_by_id(json_decode($after_json, true));

  $lines = array();

  foreach ($after as $id => $row) {
    if (!isset($before[$id])) {
      $lines[] = '<li>' . sprintf(
        /* translators: %s: date range of the added event date */
        esc_html__('Added: %s', 'soli-event'),
        esc_html(soli_events_describe_date_row($row))
      ) . '</li>';
    }
  }

  foreach ($before as $id => $row) {
    if (!isset($after[$id])) {
      $lines[] = '<li>' . sprintf(
        /* translators: %s: date range of the removed event date */
        esc_html__('Removed: %s', 'soli-event'),
        esc_html(soli_events_describe_date_row($row))
      ) . '</li>';
    }
  }

  foreach ($after as $id => $row) {
    if (!isset($before[$id])) {
      continue;
    }
    $changes = soli_events_diff_date_row($before[$id], $row);
    if ($changes) {
      $lines[] = '<li>' . sprintf(
        /* translators: 1: date range of the changed event date, 2: list of field changes */
        esc_html__('Changed %1$s: %2$s', 'soli-event'),
        esc_html(soli_events_describe_date_row($before[$id])),
        esc_html(implode(', ', $changes))
      ) . '</li>';
    }
  }

  if (empty($lines)) {
    return esc_html__('No effective changes.', 'soli-event');
  }
  return '<ul style="margin:0">' . implode('', $lines) . '</ul>';
}

function soli_events_index_dates_by_id($dates) {
  $indexed = array();
  if (is_array($dates)) {
    foreach ($dates as $row) {
      if (is_array($row) && isset($row['id'])) {
        $indexed[(int) $row['id']] = $row;
      }
    }
  }
  return $indexed;
}

function soli_events_describe_date_row($row) {
  return ($row['start_date'] ?? '?') . ' – ' . ($row['end_date'] ?? '?');
}

function soli_events_diff_date_row($before, $after) {
  $fields = array(
    'start_date' => __('start', 'soli-event'),
    'end_date' => __('end', 'soli-event'),
    'location_name' => __('location', 'soli-event'),
    'rooms' => __('rooms', 'soli-event'),
    'status' => __('status', 'soli-event'),
    'notes' => __('notes', 'soli-event'),
    'admin_notes' => __('admin notes', 'soli-event'),
    'is_concert' => __('concert', 'soli-event'),
  );

  $can_see_admin_notes = current_user_can('soli_event_admin_notes');
  $changes = array();

  foreach ($fields as $field => $label) {
    $old = $before[$field] ?? null;
    $new = $after[$field] ?? null;
    if ($old == $new) {
      continue;
    }
    if ($field === 'admin_notes' && !$can_see_admin_notes) {
      /* translators: %s: field name */
      $changes[] = sprintf(__('%s changed', 'soli-event'), $label);
      continue;
    }
    $changes[] = sprintf(
      /* translators: 1: field name, 2: old value, 3: new value */
      __('%1$s: %2$s → %3$s', 'soli-event'),
      $label,
      soli_events_format_log_value($field, $old),
      soli_events_format_log_value($field, $new)
    );
  }

  return $changes;
}

function soli_events_format_log_value($field, $value) {
  if ($value === null || $value === '') {
    return __('(empty)', 'soli-event');
  }
  if ($field === 'is_concert') {
    return $value ? __('yes', 'soli-event') : __('no', 'soli-event');
  }
  if ($field === 'rooms' && is_string($value)) {
    $rooms = json_decode($value, true);
    if (is_array($rooms)) {
      return implode(', ', $rooms);
    }
  }
  if (is_bool($value)) {
    return $value ? __('yes', 'soli-event') : __('no', 'soli-event');
  }
  return (string) $value;
}
