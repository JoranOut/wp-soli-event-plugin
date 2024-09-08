<?php

/*
  Description: Block which contains the list view of events
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockEventViewList {
  function __construct() {
    add_action('init', array($this, 'adminAssets'));
  }

  function adminAssets() {
    wp_register_style('block-event-view-list-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-event-view-list-js', plugin_dir_url(__FILE__) . 'build/index.js', array('wp-blocks', 'wp-element', 'wp-editor'), SOLI_EVENT__PLUGIN_VERSION, true);
    register_block_type('soli/event-view-list', array(
      'editor_script' => 'block-event-view-list-js',
      'editor_style' => 'block-event-view-list-css',
      'render_callback' => array($this, 'theHTML')
    ));
  }

  function theHTML($attributes){
    wp_enqueue_script('block-event-view-list-frontend',  plugin_dir_url(__FILE__) . 'build/frontend.js', array('wp-components', 'wp-element', 'wp-api-fetch'), SOLI_EVENT__PLUGIN_VERSION, true);
    wp_enqueue_style('block-event-view-list-frontend-styles',  plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);

    ob_start();?>
    <div class="block-event-view-monthly"></div>
    <?php return ob_get_clean();
  }

}

$soli_block_event_view_list = new SoliBlockEventViewList();
