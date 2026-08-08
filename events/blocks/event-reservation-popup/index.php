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
      'attributes' => array(
        'recipient' => array(
          'type' => 'string',
          'default' => '',
        ),
      ),
      'render_callback' => array($this, 'theHTML')
    ));
    wp_set_script_translations('block-event-reservation-popup-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  function theHTML($attributes){
    wp_enqueue_script('block-event-reservation-popup-frontend',  plugin_dir_url(__FILE__) . 'build/frontend.js', array('wp-components', 'wp-element', 'wp-api-fetch'), SOLI_EVENT__PLUGIN_VERSION, true);
    wp_enqueue_style('block-event-reservation-popup-frontend-styles',  plugin_dir_url(__FILE__) . 'build/index.css', array('wp-components'), SOLI_EVENT__PLUGIN_VERSION);
    wp_set_script_translations('block-event-reservation-popup-frontend', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');

    // The address the reservation mailto is pre-filled with. This is a public
    // reservation address, set per block in the editor sidebar. Falls back to
    // the 'soli_event_reservation_email' option; the filter allows a site-wide
    // override. Never put a personal/technical address here — it is printed in
    // the public HTML.
    $recipient = !empty($attributes['recipient'])
      ? $attributes['recipient']
      : get_option('soli_event_reservation_email', '');
    $recipient = sanitize_email(apply_filters('soli_event_reservation_recipient', $recipient));

    ob_start();?>
    <div class="block-event-reservation-popup" data-recipient="<?php echo esc_attr($recipient); ?>"></div>
    <?php return ob_get_clean();
  }

}

$soli_block_event_reservation_popup = new SoliBlockEventReservationPopup();
