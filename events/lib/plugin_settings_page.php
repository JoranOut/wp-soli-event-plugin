<?php
namespace Soli\Events;

add_action('admin_menu', '\Soli\Events\soli_events_add_settings_page');
function soli_events_add_settings_page() {
    add_options_page( // or add_menu_page / add_submenu_page depending on placement
        'Soli Event Settings',    // Page title
        'Soli Event Settings',    // Menu title
        'manage_options',        // Capability required
        'soli_event_settings',     // Menu slug
        'Soli\Events\soli_event_render_settings_page' // Callback to output page content
    );
}

function soli_event_render_settings_page() {
    echo '<div class="wrap">';
    echo '<h1>Soli Event Plugin Settings</h1>';
    echo '<h2>Import from TheEventCalendarTool</h2>';

    echo '<form method="post" action="options.php">';
    settings_fields('soli_event-options_group');
    do_settings_sections('soli_event_settings');
    submit_button();
    echo '</form>';

    // Migration section
    echo '<hr>';
    echo '<h2>Migration from The Events Calendar</h2>';
    echo '<form method="post">';
    submit_button('Start Migration', '', 'soli_event_start_migration');
    echo '</form>';

    // Migration feedback
    if ( isset($_POST['soli_event_start_migration']) ) {
        soli_event_handle_migration_step_1();
    }

    if ( isset($_POST['soli_event_continue_migration']) ) {
        soli_event_handle_migration();
    }
    echo '</div>';
}

add_filter('plugin_action_links_' . \SOLI_EVENT__PLUGIN_BASENAME, '\Soli\Events\soli_event_plugin_add_settings_link');
function soli_event_plugin_add_settings_link($links) {
    $settings_link = '<a href="options-general.php?page=soli_event_settings">Settings</a>';
    array_unshift($links, $settings_link); // Add to the front of existing links
    return $links;
}

function soli_event_handle_migration_step_1() {
    global $wpdb;
    $events = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'tribe_events' AND post_status = 'publish'");
    $venues = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'tribe_venue' AND post_status = 'publish'");
    echo "<p>Found <b>$events events</b> and <b>$venues venues</b> to migrate.</p>";
    echo '<form method="post">';
    submit_button('Continue Migration', '', 'soli_event_continue_migration');
    echo '</form>';
    if ( isset($_POST['soli_event_continue_migration']) ) {
        soli_event_handle_migration();
    }
}

function soli_event_handle_migration() {
    global $wpdb;
    $events = $wpdb->get_results("SELECT * FROM {$wpdb->posts} WHERE post_type = 'tribe_events' AND post_status = 'publish'");
    $total = count($events);
    $i = 0;
    foreach ($events as $event) {
        $i++;
        $new_post_id = soli_event_handle_single_migration($event);
        echo "<p>Migrated event ID {$event->ID}, {$event->post_title} to new post ID {$new_post_id} ({$i}/{$total})</p>";
        flush();
    }
    echo "<p>Migration complete.</p>";
}

/**
 * @param $event
 * @return int
 */
function soli_event_handle_single_migration($event): int
{
    global $wpdb;
    // Mark this event as to-be-migrated
    wp_update_post(['ID' => $event->ID, 'post_status' => 'to-be-migrated']);

    // Reload the event object to get the updated status
    $event = get_post($event->ID);

    // Clone all relevant fields from wp_posts except for ID and auto-generated fields
    $event_block = '<!-- wp:soli/create-event {"lock":{"move":true,"remove":true},"align":"wide"} /-->';
    $new_post = [
        'post_author'           => $event->post_author,
        'post_date'             => $event->post_date,
        'post_date_gmt'         => $event->post_date_gmt,
        'post_content'          => $event_block . "\n\n" . $event->post_content,
        'post_title'            => $event->post_title,
        'post_excerpt'          => $event->post_excerpt,
        'post_status'           => 'publish', // always publish new
        'comment_status'        => $event->comment_status,
        'ping_status'           => $event->ping_status,
        'post_password'         => $event->post_password,
        'post_name'             => $event->post_name,
        'to_ping'               => $event->to_ping,
        'pinged'                => $event->pinged,
        'post_modified'         => $event->post_modified,
        'post_modified_gmt'     => $event->post_modified_gmt,
        'post_content_filtered' => $event->post_content_filtered,
        'post_type'             => 'soli_event'
    ];
    $new_post_id = wp_insert_post($new_post);

    // Get meta
    $meta = get_post_meta($event->ID);

    // Insert into wp_event_dates
    $wpdb->insert('wp_event_dates', [
        'post_id' => $new_post_id,
        'start_date' => $meta['_EventStartDate'][0] ?? '',
        'end_date' => $meta['_EventEndDate'][0] ?? '',
        'status' => 'PUBLIC'
    ]);
    $event_date_id = $wpdb->insert_id;

    // Copy thumbnail
    if (!empty($meta['_thumbnail_id'][0])) {
        update_post_meta($new_post_id, '_thumbnail_id', $meta['_thumbnail_id'][0]);
    }

    // Migrate venue
    $venue_id = $meta['_EventVenueID'][0] ?? 0;
    if ($venue_id) {
        // Mark this venue as to-be-migrated
        wp_update_post(['ID' => $venue_id, 'post_status' => 'to-be-migrated']);

        $venue_post = get_post($venue_id);
        $venue_meta = get_post_meta($venue_id);

        // Check for existing location
        $location_exists = $venue_post->post_status === 'migrated';
        if (!$location_exists) {
            $address = implode("\n", array_filter([
                $venue_meta['_VenueAddress'][0] ?? '',
                $venue_meta['_VenueCity'][0] ?? '',
                $venue_meta['_VenueCountry'][0] ?? '',
                $venue_meta['_VenueProvince'][0] ?? '',
                $venue_meta['_VenueState'][0] ?? '',
                $venue_meta['_VenueZip'][0] ?? '',
            ]));

            // Insert into wp_event_location
            $wpdb->insert('wp_event_location', [
                'name' => $venue_post->post_title,
                'address' => $address,
            ]);
            $location_id = $wpdb->insert_id;

            // Update the event date row with the location_id
            $wpdb->update(
                'wp_event_dates',
                [ 'location' => $location_id ],
                [ 'id' => $event_date_id ]
            );

            wp_update_post(['ID' => $venue_id, 'post_status' => 'migrated']);
        }
    }

    // Mark as migrated
    wp_update_post(['ID' => $event->ID, 'post_status' => 'migrated']);
    return $new_post_id;
}
