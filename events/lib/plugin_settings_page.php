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
    echo '</div>';
}

add_filter('plugin_action_links_' . \SOLI_EVENT__PLUGIN_BASENAME, '\Soli\Events\soli_event_plugin_add_settings_link');
function soli_event_plugin_add_settings_link($links) {
    $settings_link = '<a href="options-general.php?page=soli_event_settings">Settings</a>';
    array_unshift($links, $settings_link); // Add to the front of existing links
    return $links;
}
