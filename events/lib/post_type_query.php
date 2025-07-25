<?php
namespace Soli\Events;

// Modify query to include event_dates table using LEFT JOIN
function soli_events_modify_query_clauses($clauses, $wp_query) {
  global $wpdb;

  // Ensure we're only modifying the query for our 'soli_event' post type
  if (isset($wp_query->query_vars['post_type'])
      && 'soli_event' === $wp_query->query_vars['post_type']
      && !$wp_query->is_singular) {
    // Alias the custom event_dates table
    $event_dates_table = $wpdb->prefix . 'event_dates';
    $event_location_table = $wpdb->prefix . "event_location";

    // Modify the JOIN clause to include the event_dates table
    if (false === strpos($clauses['join'], "JOIN $event_dates_table")) {
        $clauses['join'] .= " LEFT JOIN $event_dates_table ON $wpdb->posts.ID = $event_dates_table.post_id ";
    }
    if (false === strpos($clauses['join'], "JOIN $event_location_table")) {
        $clauses['join'] .= " LEFT JOIN $event_location_table ON $event_dates_table.location = $event_location_table.id ";
    }

    // Select additional fields from the event_dates table (e.g., start_date, end_date, location, status)
    $clauses['fields'] .= ", $event_dates_table.id as event_id, $event_dates_table.start_date, $event_dates_table.end_date, $event_dates_table.status ".
                          ", $event_dates_table.notes, $event_dates_table.rooms ";

    $clauses['fields'] .= ", $event_location_table.name as location_name, $event_location_table.address as location_address ";

    // Apply filter based on dropdown selection
    if (!isset($_GET['event_filter']) || $_GET['event_filter'] === 'future') {
      $current_day_start = current_time('Y-m-d') . ' 00:00:00';

      // Add a condition to filter out past events
      $clauses['where'] .= $wpdb->prepare(" AND $event_dates_table.end_date >= %s", $current_day_start);
    }

    // lets sort by start_date by default or if specified in the query
    if (empty($wp_query->query_vars['orderby'])) {
        // Default order by post date if not specified
        $order = !isset($_GET['event_filter']) || $_GET['event_filter'] === 'future' ? 'ASC' : 'DESC';
        $clauses['orderby'] = "$event_dates_table.start_date $order";
    }
  }

  return $clauses;
}
add_filter('posts_clauses', 'Soli\Events\soli_events_modify_query_clauses', 10, 2);

function custom_event_post_count($counts, $post_type, $perm) {
  global $wpdb;

  // Only modify the count for the 'soli_event' post type
  if ($post_type === 'soli_event') {
    $event_dates_table = $wpdb->prefix . 'event_dates';

    // Count the number of event dates linked to each event
    $query = "
            SELECT COUNT(*) as count, post_status
            FROM $wpdb->posts
            LEFT JOIN $event_dates_table ON $wpdb->posts.ID = $event_dates_table.post_id
            WHERE $wpdb->posts.post_type = %s
            GROUP BY post_status
        ";

    // Get the counts for all statuses
    $results = $wpdb->get_results($wpdb->prepare($query, $post_type), OBJECT);

    // Set counts based on event_dates entries
    foreach ($results as $row) {
      if (isset($counts->{$row->post_status})) {
        $counts->{$row->post_status} = $row->count;
      }
    }
  }

  return $counts;
}

// Hook into `wp_count_posts` to modify post counts
add_filter('wp_count_posts', 'Soli\Events\custom_event_post_count', 999, 3);

function soli_events_add_filter_dropdown() {
  global $typenow;

  // Ensure this filter is only added for the 'soli_event' post type
  if ($typenow === 'soli_event') {
    // Get the current filter value (default to 'future' if not set)
    $selected = isset($_GET['event_filter']) ? $_GET['event_filter'] : 'future';

    echo '<select name="event_filter" id="event_filter">';
    echo '<option value="future"' . selected($selected, 'future', false) . '>Future Events</option>';
    echo '<option value="all"' . selected($selected, 'all', false) . '>All Events</option>';
    echo '</select>';
  }
}
add_action('restrict_manage_posts', 'Soli\Events\soli_events_add_filter_dropdown');
