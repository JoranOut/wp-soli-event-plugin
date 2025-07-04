<?php

add_filter('manage_soli_event_posts_columns', 'set_custom_edit_soli_event_columns');
function set_custom_edit_soli_event_columns($columns) {
  $columns['start_date'] = __('Start Date', 'your_text_domain');
  $columns['end_date'] = __('End Date', 'your_text_domain');
  $columns['location'] = __('Location', 'your_text_domain');
  $columns['status'] = __('Status', 'your_text_domain');
  $columns['notes'] = __('Notes', 'your_text_domain');

  // Remove category, tags, and date columns
  unset($columns['categories']); // categories column key (category)
  unset($columns['tags']);       // tags column key
  unset($columns['date']);       // date column key
  return $columns;
}

add_filter('manage_edit-soli_event_sortable_columns', 'soli_event_sortable_columns');
function soli_event_sortable_columns($columns) {
  $columns['start_date'] = 'start_date';
  return $columns;
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
    return "<div style='cursor: help; text-decoration: underline' title='" . esc_html($post->location_address) . "'>" . esc_html($post->location_name) . "</div>";
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


add_filter('posts_clauses', 'soli_event_extend_admin_query_clauses', 10, 2);
function soli_event_extend_admin_query_clauses($clauses, $query) {
    global $pagenow, $post_type, $wpdb;

    if (
        is_admin()
        && $pagenow === 'edit.php'
        && $post_type === 'soli_event'
        && $query->is_main_query()
    ) {
        $event_dates_table = $wpdb->prefix . 'event_dates';
        $event_location_table = $wpdb->prefix . 'event_location';

        if (false === strpos($clauses['join'], "JOIN $event_dates_table")) {
            $clauses['join'] .= " LEFT JOIN $event_dates_table ON $wpdb->posts.ID = $event_dates_table.post_id ";
        }

        if (false === strpos($clauses['join'], "JOIN $event_location_table")) {
            $clauses['join'] .= " LEFT JOIN $event_location_table ON $event_dates_table.location = $event_location_table.id ";
        }

        $clauses['fields'] .= ", $event_dates_table.start_date
                                , $event_dates_table.end_date
                                , $event_dates_table.status
                                , $event_dates_table.notes
                                , $event_dates_table.rooms ";
        $clauses['fields'] .= ", $event_location_table.name
                                , $event_location_table.address";

        if ($search_term = $query->get('s')) {
            $like = '%' . $wpdb->esc_like($search_term) . '%';

            $clauses['where'] .= $wpdb->prepare(
                " OR $event_dates_table.start_date LIKE %s
                  OR $event_dates_table.end_date LIKE %s
                  OR $event_location_table.name LIKE %s
                  OR $event_location_table.address LIKE %s
                  OR $event_dates_table.status LIKE %s
                  OR $event_dates_table.notes LIKE %s ",
                $like, $like, $like, $like, $like, $like
            );
        }
    }

    return $clauses;
}
