<?php

/*
  Description: Block which contains all settings to create an event
*/

class SoliBlockCreateEvent {
  function __construct() {
    add_action('init', array($this, 'adminAssets'));
  }

  function adminAssets() {
    wp_register_style('block-create-event-css', plugin_dir_url(__FILE__) . 'build/index.css');
    wp_register_script('block-create-event-js', plugin_dir_url(__FILE__) . 'build/index.js', array('wp-blocks', 'wp-element', 'wp-editor'));
    register_block_type('text/create-event', array(
      'editor_script' => 'block-create-event-js',
      'editor_style' => 'block-create-event-css',
      'render_callback' => array($this, 'theHTML')
    ));
  }

  function theHTML($attributes) {
    ob_start(); ?>
    <h3>Today the sky is <?php echo esc_html($attributes['skyColor']) ?> and the grass is <?php echo esc_html($attributes['grassColor']) ?>!</h3>
    <?php return ob_get_clean();
  }
}

$areYouPayingAttention = new SoliBlockCreateEvent();
