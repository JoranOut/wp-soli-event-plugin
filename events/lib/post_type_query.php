<?php
namespace Soli\Events;

// Modify query to include event_dates table using LEFT JOIN
function soli_events_modify_query_clauses($clauses, $wp_query) {
  global $wpdb;

  // Ensure we're only modifying the query for our 'soli_event' post type
  if (isset($wp_query->query_vars['post_type']) && 'soli_event' === $wp_query->query_vars['post_type']) {
    // Alias the custom event_dates table
    $event_dates_table = $wpdb->prefix . 'event_dates';
    $event_location_table = $wpdb->prefix . "event_location";

    // Modify the JOIN clause to include the event_dates table
    $clauses['join'] .= " LEFT JOIN $event_dates_table ON $wpdb->posts.ID = $event_dates_table.post_id ";
    $clauses['join'] .= " LEFT JOIN $event_location_table ON $event_dates_table.location = $event_location_table.id ";

    // Select additional fields from the event_dates table (e.g., start_date, end_date, location, status)
    $clauses['fields'] .= ", $event_dates_table.start_date, $event_dates_table.end_date, $event_dates_table.status ".
                          ", $event_dates_table.notes, $event_dates_table.rooms ";

    $clauses['fields'] .= ", $event_location_table.name as location_name, $event_location_table.address as location_address ";
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
