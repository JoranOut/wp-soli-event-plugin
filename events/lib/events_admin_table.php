<?php

add_filter('manage_soli_event_posts_columns', 'set_custom_edit_soli_event_columns');
function set_custom_edit_soli_event_columns($columns) {
  $columns['start_date'] = __('Start Date', 'your_text_domain');
  $columns['end_date'] = __('End Date', 'your_text_domain');
  $columns['location'] = __('Location', 'your_text_domain');
  $columns['status'] = __('Status', 'your_text_domain');
  $columns['notes'] = __('Notes', 'your_text_domain');
  return $columns;
}

add_filter('manage_edit-soli_event_sortable_columns', 'soli_event_sortable_columns');
function soli_event_sortable_columns($columns) {
  $columns['start_date'] = 'start_date';
  return $columns;
}

add_action('pre_get_posts', 'set_default_sort_order', 99);
function set_default_sort_order($query) {
  global $pagenow, $post_type;

  if (is_admin() && $pagenow == 'edit.php' && $post_type == 'soli_event' && $query->is_main_query()) {
    $orderby = $query->get('orderby');

    switch ($orderby) {
      case '':
        $query->set('orderby', 'start_date');
        $query->set('order', 'asc');
        break;
    }
  }
}


add_filter('posts_clauses', 'modify_posts_clauses', 10, 2);
function modify_posts_clauses($clauses, $query) {
  global $wpdb, $pagenow, $post_type;

  if (is_admin() && $pagenow == 'edit.php' && $post_type == 'soli_event' && $query->is_main_query()) {
    $event_dates = $wpdb->prefix . "event_dates";
    $event_location = $wpdb->prefix . "event_location";

    $clauses['fields'] .= ", {$event_dates}.start_date, {$event_dates}.end_date, {$event_location}.name as location_name" .
      ", {$event_location}.address as location_address, {$event_dates}.rooms, {$event_dates}.status, {$event_dates}.notes";
    $clauses['join'] .= " LEFT JOIN {$event_dates} ON {$wpdb->posts}.ID = {$event_dates}.post_id ";
    $clauses['join'] .= " LEFT JOIN {$event_location} ON {$event_dates}.location = {$event_location}.id ";

    if ($query->get('orderby') == 'start_date') {
      $clauses['orderby'] = "{$event_dates}.start_date " . ($query->get('order') === 'asc' ? 'ASC' : 'DESC');
    }
  }

  return $clauses;
}

add_filter('posts_search', 'custom_event_dates_search', 10, 2);
function custom_event_dates_search($search, $query) {
  global $wpdb, $pagenow, $post_type;

  if (is_admin() && $pagenow == 'edit.php' && $post_type == 'soli_event' && $query->is_search() && $query->is_main_query()) {
    $search_term = $query->get('s');
    $search = $wpdb->prepare("
            AND (
                {$wpdb->posts}.post_title LIKE %s
                OR {$wpdb->posts}.post_content LIKE %s
                OR {$wpdb->prefix}event_dates.start_date LIKE %s
                OR {$wpdb->prefix}event_dates.end_date LIKE %s
                OR {$wpdb->prefix}event_dates.status LIKE %s
                OR {$wpdb->prefix}event_dates.notes LIKE %s
                OR {$wpdb->prefix}event_location.name LIKE %s
            )
        ",
      '%' . $wpdb->esc_like($search_term) . '%',
      '%' . $wpdb->esc_like($search_term) . '%',
      '%' . $wpdb->esc_like($search_term) . '%',
      '%' . $wpdb->esc_like($search_term) . '%',
      '%' . $wpdb->esc_like($search_term) . '%',
      '%' . $wpdb->esc_like($search_term) . '%',
      '%' . $wpdb->esc_like($search_term) . '%');
  }

  return $search;
}

add_action('manage_soli_event_posts_custom_column', 'custom_soli_event_column', 10, 2);
function custom_soli_event_column($column, $post_id) {
  global $post;
  if ($column === 'start_date' || $column === 'end_date') {
    $date_format = get_option('date_format');
    $time_format = get_option('time_format');

    if ($column === 'start_date') {
      echo esc_html($post->start_date ?
        date_i18n("$date_format $time_format", strtotime($post->start_date))
        : __('—', 'your_text_domain'));
    }

    if ($column === 'end_date') {
      echo esc_html($post->end_date ?
        date_i18n("$date_format $time_format", strtotime($post->end_date))
        : __('—', 'your_text_domain'));
    }
  }
  if ($column === 'location') {
    echo getLocationByEvent($post);
  }
  if ($column === 'status') {
    echo esc_html($post->status ?? __('—', 'your_text_domain'));
  }
  if ($column === 'notes') {
    if (!empty($post->notes)) {
      echo '<div title="' . esc_attr($post->notes) . '">' . esc_html($post->notes) . '</div>';
    } else {
      echo __('-', 'your_text_domain');
    }
  }
}

function getLocationByEvent($post) {
  $rooms = $post->rooms;
  if ($rooms) {
    return esc_html(Soli\Events\Values\translateLocation($rooms));
  }

  if (!empty($post->location_name)) {
    return "<div style='cursor: help; text-decoration: underline' title=" . esc_html($post->location_address) . ">" . esc_html($post->location_name) . "</div>";
  }

  return __('—', 'your_text_domain');
}

function load_events_admin_style($hook) {
  global $post_type;

  // Check if we are on the admin page for soli_event post type
  if ($hook == 'edit.php' && $post_type == 'soli_event') {
    // Enqueue the custom CSS file
    wp_enqueue_style('events_admin_style_css', plugin_dir_url(__FILE__) . 'events-admin-style.css');
  }
}

add_action('admin_enqueue_scripts', 'load_events_admin_style');
