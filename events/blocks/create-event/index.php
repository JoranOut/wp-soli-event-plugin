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
    register_block_type('soli/create-event', array(
      'editor_script' => 'block-create-event-js',
      'editor_style' => 'block-create-event-css',
      'render_callback' => array($this, 'theHTML')
    ));
  }

  function theHTML($attributes){
    wp_enqueue_script('block-event-view-frontend',  plugin_dir_url(__FILE__) . 'build/frontend.js', array('wp-components', 'wp-element', 'wp-api-fetch'), '1.0', true);
    wp_enqueue_style('block-event-view-frontend-styles',  plugin_dir_url(__FILE__) . 'build/frontend.css');

    ob_start();?>
      <div class="block-event-view" data-id="<?php echo get_the_ID() ?>"></div>
    <?php return ob_get_clean();
  }

}

$areYouPayingAttention = new SoliBlockCreateEvent();
