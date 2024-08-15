<?php

/*
  Description: Block which contains the monthly view of events
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockEventViewMonthly {
  function __construct() {
    add_action('init', array($this, 'adminAssets'));
  }

  function adminAssets() {
    wp_register_script('block-event-view-monthly-js', plugin_dir_url(__FILE__) . 'build/index.js', array('wp-blocks', 'wp-element', 'wp-editor'));
    wp_register_style('block-event-view-monthly-css', plugin_dir_url(__FILE__) . 'build/index.css');
    register_block_type('soli/event-view-monthly', array(
      'editor_script' => 'block-event-view-monthly-js',
      'editor_style' => 'block-event-view-monthly-css',
      'render_callback' => array($this, 'theHTML')
    ));
  }

  function theHTML($attributes){
    wp_enqueue_script('block-event-view-monthly-frontend',  plugin_dir_url(__FILE__) . 'build/frontend.js', array('wp-components', 'wp-element', 'wp-api-fetch'), '1.0', true);
    wp_enqueue_style('block-event-view-monthly-frontend-styles',  plugin_dir_url(__FILE__) . 'build/index.css');

    ob_start();?>
    <div class="block-event-view-monthly alignwide"></div>
    <?php return ob_get_clean();
  }

}

$soli_block_event_view_monthly = new SoliBlockEventViewMonthly();
