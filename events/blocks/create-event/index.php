<?php

/*
  Description: Block which contains all settings to create an event
*/

class SoliBlockCreateEvent {
  function __construct() {
    add_action('init', array($this, 'adminAssets'));
  }

  function adminAssets() {
    wp_register_style('block-create-event-css', plugin_dir_url(__FILE__) . 'build/index.css', SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-create-event-js', plugin_dir_url(__FILE__) . 'build/index.js', array('wp-blocks', 'wp-element', 'wp-editor'), SOLI_EVENT__PLUGIN_VERSION, true);
    wp_localize_script('block-create-event-js', 'createEventPermissions', array(
        'canSeeAdminNotes' => current_user_can( 'soli_event_admin_notes' )
    ));
    register_block_type('soli/create-event', array(
      'editor_script' => 'block-create-event-js',
      'editor_style' => 'block-create-event-css',
      'render_callback' => array($this, 'theHTML')
    ));
    wp_set_script_translations('block-create-event-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  function theHTML($attributes) {
    wp_enqueue_script('block-event-view-frontend', plugin_dir_url(__FILE__) . 'build/frontend.js', array('wp-components', 'wp-element', 'wp-api-fetch'), SOLI_EVENT__PLUGIN_VERSION, true);
    wp_enqueue_style('block-event-view-frontend-styles', plugin_dir_url(__FILE__) . 'build/frontend.css', array(), SOLI_EVENT__PLUGIN_VERSION);

    ob_start(); ?>
      <div class="block-event-view" data-id="<?php echo get_the_ID() ?>"></div>
    <?php return ob_get_clean();
  }

}

$areYouPayingAttention = new SoliBlockCreateEvent();
