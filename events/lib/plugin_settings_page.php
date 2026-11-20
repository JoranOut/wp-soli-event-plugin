<?php
namespace Soli\Events;

add_action('admin_menu', '\Soli\Events\soli_events_add_settings_page');
function soli_events_add_settings_page() {
    add_options_page( // or add_menu_page / add_submenu_page depending on placement
        __('Soli Event Settings', 'soli-event'),    // Page title
        __('Soli Event Settings', 'soli-event'),    // Menu title
        'manage_options',        // Capability required
        'soli_event_settings',     // Menu slug
        'Soli\Events\soli_event_render_settings_page' // Callback to output page content
    );
}

function soli_event_render_settings_page() {
    echo '<div class="wrap">';
    echo '<h1>' . esc_html__('Soli Event Plugin Settings', 'soli-event') . '</h1>';

    soli_event_render_building_feed_section();

    echo '<hr>';
    echo '<h2>' . esc_html__('Import from TheEventCalendarTool', 'soli-event') . '</h2>';

    echo '<form method="post" action="options.php">';
    settings_fields('soli_event-options_group');
    do_settings_sections('soli_event_settings');
    submit_button();
    echo '</form>';

    // Migration section
    echo '<hr>';
    echo '<h2>' . esc_html__('Migration from The Events Calendar', 'soli-event') . '</h2>';
    echo '<form method="post">';
    submit_button(__('Start Migration', 'soli-event'), '', 'soli_event_start_migration');
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

function soli_event_render_building_feed_section() {
    echo '<h2>' . esc_html__('Building feed', 'soli-event') . '</h2>';
    if (isset($_GET['soli_event_token_regenerated'])) {
        echo '<div class="notice notice-success inline"><p>' . esc_html__('New link created. The old link no longer works.', 'soli-event') . '</p></div>';
    }
    echo '<p>' . esc_html__('All upcoming public and private dates in the Muziekcentrum, with real titles and booked rooms, for example for the heating system. Anyone with this link can read the schedule, so share it only with systems that need it.', 'soli-event') . '</p>';
    echo '<p><input type="text" class="large-text code" readonly onfocus="this.select()" id="soli-event-building-feed-url" value="' . esc_attr(soli_events_building_feed_url()) . '"></p>';
    echo '<p class="description">' . sprintf(
        /* translators: %s: example query argument */
        esc_html__('Limit to rooms with %s (comma-separated).', 'soli-event'),
        '<code>&amp;zaal=' . esc_html(implode(',', SOLI_ROOM_SLUGS)) . '</code>'
    ) . '</p>';
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    echo '<input type="hidden" name="action" value="soli_event_regenerate_building_token">';
    wp_nonce_field('soli_event_regenerate_building_token');
    submit_button(__('Create new link', 'soli-event'), 'secondary', 'submit', false);
    echo '</form>';
}

add_action('admin_post_soli_event_regenerate_building_token', '\Soli\Events\soli_event_handle_regenerate_building_token');
function soli_event_handle_regenerate_building_token() {
    if (!current_user_can('manage_options')) {
        wp_die(esc_html__('You are not allowed to do this.', 'soli-event'), 403);
    }
    check_admin_referer('soli_event_regenerate_building_token');
    soli_events_regenerate_building_feed_token();
    wp_safe_redirect(add_query_arg(
        array('page' => 'soli_event_settings', 'soli_event_token_regenerated' => 1),
        admin_url('options-general.php')
    ));
    exit;
}

add_filter('plugin_action_links_' . \SOLI_EVENT__PLUGIN_BASENAME, '\Soli\Events\soli_event_plugin_add_settings_link');
function soli_event_plugin_add_settings_link($links) {
    $settings_link = '<a href="options-general.php?page=soli_event_settings">' . esc_html__('Settings', 'soli-event') . '</a>';
    array_unshift($links, $settings_link); // Add to the front of existing links
    return $links;
}

function soli_event_handle_migration_step_1() {
    global $wpdb;
    $events = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'tribe_events' AND post_status = 'publish'");
    $venues = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'tribe_venue' AND post_status = 'publish'");
    echo '<p>' . sprintf(
        esc_html__('Found %1$s events and %2$s venues to migrate.', 'soli-event'),
        '<b>' . esc_html($events) . '</b>',
        '<b>' . esc_html($venues) . '</b>'
    ) . '</p>';
    echo '<form method="post">';
    submit_button(__('Continue Migration', 'soli-event'), '', 'soli_event_continue_migration');
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
        echo '<p>' . sprintf(
            esc_html__('Migrated event ID %1$s, %2$s to new post ID %3$s (%4$s)', 'soli-event'),
            esc_html($event->ID),
            esc_html($event->post_title),
            esc_html($new_post_id),
            esc_html("{$i}/{$total}")
        ) . '</p>';
        flush();
    }
    echo '<p>' . esc_html__('Migration complete.', 'soli-event') . '</p>';
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
