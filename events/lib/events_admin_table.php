<?php

add_filter('manage_soli_event_posts_columns', 'set_custom_edit_soli_event_columns');
function set_custom_edit_soli_event_columns($columns) {
  $columns['start_date'] = __('Start Date', 'soli-event');
  $columns['end_date'] = __('End Date', 'soli-event');
  $columns['location'] = __('Location', 'soli-event');
  $columns['status'] = __('Status', 'soli-event');
  $columns['notes'] = __('Notes', 'soli-event');

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
    $tz = wp_timezone();

    if ($column === 'start_date') {
        if($post->start_date) {
            $dt = new DateTime($post->start_date, $tz);
            echo esc_html( $dt->format("$date_format $time_format"));
        } else {
            echo esc_html(__('—', 'soli-event'));
        }
    }

    if ($column === 'end_date') {
        if($post->end_date) {
            $dt = new DateTime($post->end_date, $tz);
            echo esc_html( $dt->format("$date_format $time_format"));
        } else {
            echo esc_html(__('—', 'soli-event'));
        }
    }
  }
  if ($column === 'location') {
    echo getLocationByEvent($post);
  }
  if ($column === 'status') {
    echo esc_html($post->status ?? __('—', 'soli-event'));
  }
  if ($column === 'notes') {
      echo extractNotesAndAdminNotes($post);
  }
}

function extractNotesAndAdminNotes($post): string
{
    $output = '';

    // Show admin notes for users with the capability, prefixed with "admin notes:"
    if (current_user_can('soli_event_admin_notes') && !empty($post->admin_notes)) {
        $output .= '<div style="font-weight:600; color:red; margin-bottom:4px;" title="' . esc_attr($post->admin_notes) . '">'
            . esc_html($post->admin_notes)
            . esc_html__(' (admin notes)', 'soli-event') . ' '
            . '</div>';
    }

    // Show regular notes
    if (!empty($post->notes)) {
        $output .= '<div title="' . esc_attr($post->notes) . '">' . esc_html($post->notes) . '</div>';
    }

    if ($output === '') {
        $output = __('-', 'soli-event');
    }

    return $output;
}

function getLocationByEvent($post) {
  $rooms = $post->rooms;
  if (!empty($rooms) && $rooms !== 'null') {
    $decoded = json_decode($rooms);
    if (is_array($decoded) && count($decoded) > 0) {
      return join(", ", $decoded);
    }
  }

  if (!empty($post->location_name)) {
    $name = esc_html($post->location_name);
    $address = esc_html($post->location_address);
    return "<div>" . $name . ($address !== '' ? "<br><span style='font-style: italic'>" . $address . "</span>" : '') . "</div>";
  }

  return __('—', 'soli-event');
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
                                , $event_dates_table.admin_notes
                                , $event_dates_table.rooms ";
        $clauses['fields'] .= ", $event_location_table.name as location_name
                                , $event_location_table.address as location_address";

        if ($search_term = $query->get('s')) {
            $like = '%' . $wpdb->esc_like($search_term) . '%';

            $clauses['where'] .= $wpdb->prepare(
                " OR $event_dates_table.start_date LIKE %s
                  OR $event_dates_table.end_date LIKE %s
                  OR $event_location_table.name LIKE %s
                  OR $event_location_table.address LIKE %s
                  OR $event_dates_table.status LIKE %s
                  OR $event_dates_table.notes LIKE %s 
                  OR $event_dates_table.admin_notes LIKE %s ",
                $like, $like, $like, $like, $like, $like, $like
            );
        }
    }

    return $clauses;
}

add_filter('post_row_actions', 'add_custom_view_link_with_event_param', 10, 2);
function add_custom_view_link_with_event_param($actions, $post) {
    if ($post->post_type === 'soli_event') {
        $event_id = $post->event_id;
        if (empty($event_id)) {
            $event_id = $post->ID;
        }

        // Get permalink to the single event page
        $permalink = get_permalink($post->ID);

        // Append the 'event' URL parameter
        $url_with_param = add_query_arg('event', $event_id, $permalink);

        // Add the custom View link opening in a new tab
        $view = '<a href="' . esc_url($url_with_param) . '" target="_blank">' . __('View', 'soli-event') . '</a>';

        $actions['view'] = $view;
    }

    return $actions;
}