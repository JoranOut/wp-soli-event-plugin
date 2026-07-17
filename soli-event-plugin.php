<?php

namespace Soli\Events;
/*
  Plugin Name: Soli Event Plugin
  Version: 1.1.3
  Author: Joran Out
  Text Domain: soli-event
  Domain Path: /languages
*/

if (!defined('ABSPATH')) exit; // Exit if accessed directly

add_action('init', function () {
  load_plugin_textdomain('soli-event', false, dirname(plugin_basename(__FILE__)) . '/languages');
});
define('SOLI_EVENT__PLUGIN_DIR_PATH', plugin_dir_path(__FILE__));
define('SOLI_EVENT__PLUGIN_BASENAME', plugin_basename(__FILE__));
define('SOLI_EVENT__PLUGIN_DIR_URL', plugin_dir_url(__FILE__));
define('SOLI_EVENT__PLUGIN_VERSION', "1.1.3");

require_once 'events/events.php';

register_activation_hook(__FILE__, "Soli\Events\onActivate");
function onActivate() {
  $eventsDatesTableHandler = new EventsDatesTableHandler();
  $eventsDatesTableHandler->createEventTable();
  $eventsLocationTableHandler = new LocationTableHandler();
  $eventsLocationTableHandler->createLocationTable();
  $eventsLogTableHandler = new EventsLogTableHandler();
  $eventsLogTableHandler->createEventLogTable();
  flush_rewrite_rules();
}

register_uninstall_hook(__FILE__, 'Soli\Events\onUninstall');
function onUninstall() {
  $eventsDatesTableHandler = new EventsDatesTableHandler();
  $eventsDatesTableHandler->dropEventTable();
  $eventsLocationTableHandler = new LocationTableHandler();
  $eventsLocationTableHandler->dropLocationTable();
  $eventsLogTableHandler = new EventsLogTableHandler();
  $eventsLogTableHandler->dropEventLogTable();
  // Transport meta is normally deleted right after each save; clean up any
  // rows left behind by interrupted saves.
  delete_post_meta_by_key(SOLI_EVENT_DATES_META_KEY);
}

register_deactivation_hook(__FILE__, 'Soli\Events\onDeactivate');
function onDeactivate() {
  // Unregister the post type, so the rules are no longer in memory.
  unregister_post_type('soli_event');
  // Clear the permalinks to remove our post type's rules from the database.
  flush_rewrite_rules();
}

add_action('init', function () {
  include_once 'updater.php';

  if (!defined('WP_GITHUB_FORCE_UPDATE')) define('WP_GITHUB_FORCE_UPDATE', true);

  if (is_admin()) { // note the use of is_admin() to double check that this is happening in the admin

    $config = array(
      'slug' => plugin_basename(__FILE__), // this is the slug of your plugin
      'proper_folder_name' => dirname( plugin_basename( __FILE__ ) ), // this is the name of the folder your plugin lives in
      'api_url' => 'https://api.github.com/repos/JoranOut/wp-soli-event-plugin', // the GitHub API url of your GitHub repo
      'raw_url' => 'https://raw.github.com/JoranOut/wp-soli-event-plugin/main', // the GitHub raw url of your GitHub repo
      'github_url' => 'https://github.com/JoranOut/wp-soli-event-plugin', // the GitHub url of your GitHub repo
      'zip_url' => 'https://github.com/JoranOut/wp-soli-event-plugin/archive/refs/heads/main.zip', // the zip url of the GitHub repo
      'sslverify' => true, // whether WP should check the validity of the SSL cert when getting an update, see https://github.com/jkudish/WordPress-GitHub-Plugin-Updater/issues/2 and https://github.com/jkudish/WordPress-GitHub-Plugin-Updater/issues/4 for details
      'requires' => '6.0.0', // which version of WordPress does your plugin require?
      'tested' => '6.6.6',  // which version of WordPress is your plugin tested up to?
      'readme' => 'README.md', // which file to use as the readme for the version number
    );

    new WP_GitHub_Updater($config);
  }
});
