<?php

/*
  Description: Block which contains the calendar view of events
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockEventViewCalendar {
  function __construct() {
    add_action('init', array($this, 'adminAssets'));
  }

  function adminAssets() {
    wp_register_script('block-event-view-calendar-js', plugin_dir_url(__FILE__) . 'build/index.js', array('wp-blocks', 'wp-element', 'wp-editor'), SOLI_EVENT__PLUGIN_VERSION, true);
    wp_register_style('block-event-view-calendar-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    register_block_type('soli/event-view-calendar', array(
      'editor_script' => 'block-event-view-calendar-js',
      'editor_style' => 'block-event-view-calendar-css',
      'render_callback' => array($this, 'theHTML')
    ));
    wp_set_script_translations('block-event-view-calendar-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  function theHTML($attributes){
    wp_enqueue_script('block-event-view-calendar-frontend',  plugin_dir_url(__FILE__) . 'build/frontend.js', array('wp-components', 'wp-element', 'wp-api-fetch'), SOLI_EVENT__PLUGIN_VERSION, true);
    wp_enqueue_style('block-event-view-calendar-frontend-styles',  plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_set_script_translations('block-event-view-calendar-frontend', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');

    $type = isset($attributes['calendar_type']) ? $attributes['calendar_type'] : 'month';
    $classes = array('block-event-view-calendar', 'alignwide', 'type-' . preg_replace('/[^a-z]/', '', $type));
    if (!empty($attributes['adjustable'])) {
        $classes[] = 'adjustable';
    }
    if (!empty($attributes['only_concerts'])) {
        $classes[] = 'only-concerts';
    }
    if (!empty($attributes['show_rooms_filter'])) {
        $classes[] = 'show-rooms-filter';
    }

    ob_start();?>
    <div class="<?php echo esc_attr(implode(' ', $classes)); ?>"></div>
    <?php return ob_get_clean();
  }

}

$soli_block_event_view_calendar = new SoliBlockEventViewCalendar();
