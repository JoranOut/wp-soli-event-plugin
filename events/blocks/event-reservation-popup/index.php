<?php

/*
  Description: Block which contains a reservation tool for events
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockEventReservationPopup {
  function __construct() {
    add_action('init', array($this, 'adminAssets'));
  }

  function adminAssets() {
    wp_register_script('block-event-reservation-popup-js', plugin_dir_url(__FILE__) . 'build/index.js', array('wp-blocks', 'wp-element', 'wp-editor'), SOLI_EVENT__PLUGIN_VERSION, true);
    wp_register_style('block-event-reservation-popup-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    register_block_type('soli/event-reservation-popup', array(
      'editor_script' => 'block-event-reservation-popup-js',
      'editor_style' => 'block-event-reservation-popup-css',
      'render_callback' => array($this, 'theHTML')
    ));
  }

  function theHTML($attributes){
    wp_enqueue_script('block-event-reservation-popup-frontend',  plugin_dir_url(__FILE__) . 'build/frontend.js', array('wp-components', 'wp-element', 'wp-api-fetch'), SOLI_EVENT__PLUGIN_VERSION, true);
    wp_enqueue_style('block-event-reservation-popup-frontend-styles',  plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);

    ob_start();?>
    <div class="block-event-reservation-popup"></div>
    <?php return ob_get_clean();
  }

}

$soli_block_event_reservation_popup = new SoliBlockEventReservationPopup();
