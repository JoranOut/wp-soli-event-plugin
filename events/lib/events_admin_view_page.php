<?php

namespace Soli\Events;

function soli_events_add_admin_view_page() {
  // Add submenu under the 'soli_event' post type menu
  add_submenu_page(
    'edit.php?post_type=soli_event', // Parent slug (links to Events menu)
    'Admin View',                   // Page title
    'Admin View',                   // Menu title
    'manage_options',               // Capability required to access
    'soli_event_admin_view',        // Menu slug
    'Soli\Events\soli_events_render_admin_view_page', // Callback function to render the page
    2
  );
}

add_action('admin_menu', 'Soli\Events\soli_events_add_admin_view_page');

function soli_events_render_admin_view_page() {?>
    <div class="wrap">
        <h1><?php echo esc_html__('Admin View', 'soli_events'); ?></h1>
        <p><?php echo esc_html__('This page displays various calendar views for managing your events.'); ?></p>

        <!-- Block Container -->
        <div class="block-event-view-calendar alignwide type-week adjustable show-rooms-filter"></div>
    </div>
<?php
}

function soli_events_enqueue_admin_view_assets($hook) {
  // Ensure we're only enqueueing on the "Admin View" page
  if ($hook !== 'soli_event_page_soli_event_admin_view') {
    return;
  }

  wp_enqueue_script('block-event-view-calendar-frontend',
    SOLI_EVENT__PLUGIN_DIR_URL . 'events/blocks/event-view-calendar/build/frontend.js',
    array('wp-components', 'wp-element', 'wp-api-fetch'), SOLI_EVENT__PLUGIN_VERSION, true);
  wp_enqueue_style('block-event-view-calendar-frontend-styles',
    SOLI_EVENT__PLUGIN_DIR_URL . 'events/blocks/event-view-calendar/build/index.css',
    array(), SOLI_EVENT__PLUGIN_VERSION);
}

add_action('admin_enqueue_scripts', 'Soli\Events\soli_events_enqueue_admin_view_assets');
