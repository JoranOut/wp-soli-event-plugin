<?php

/*
  Plugin Name: Soli Event Plugin
  Version: 1.0
  Author: Joran Out
*/

require_once 'events/events.php';
use Soli\Events\EventsDatesTableCreation;

if (!defined('ABSPATH')) exit; // Exit if accessed directly
define( 'SOLI_EVENT__PLUGIN_DIR_PATH', plugin_dir_path( __FILE__ ) );
define( 'SOLI_EVENT__PLUGIN_DIR_URL', plugin_dir_url( __FILE__ ) );

register_activation_hook( __FILE__, "onActivate" );
function onActivate(){
  $eventsDatesTableHandler = new Soli\Events\EventsDatesTableHandler();
  $eventsDatesTableHandler->createTable();
  flush_rewrite_rules();
}

add_action( 'init', 'github_plugin_updater_init' );
function github_plugin_updater_init() {

  include_once 'updater.php';

  define( 'WP_GITHUB_FORCE_UPDATE', true );

  if ( is_admin() ) { // note the use of is_admin() to double check that this is happening in the admin

    $config = array(
      'slug' => plugin_basename( __FILE__ ), // this is the slug of your plugin
      'proper_folder_name' => plugin_basename( __FILE__ ), // this is the name of the folder your plugin lives in
      'api_url' => 'https://api.github.com/repos/jkudish/WordPress-GitHub-Plugin-Updater', // the GitHub API url of your GitHub repo
      'raw_url' => 'https://raw.github.com/jkudish/WordPress-GitHub-Plugin-Updater/master', // the GitHub raw url of your GitHub repo
      'github_url' => 'https://github.com/jkudish/WordPress-GitHub-Plugin-Updater', // the GitHub url of your GitHub repo
      'zip_url' => 'https://github.com/jkudish/WordPress-GitHub-Plugin-Updater/archive/master.zip', // the zip url of the GitHub repo
      'sslverify' => true, // whether WP should check the validity of the SSL cert when getting an update, see https://github.com/jkudish/WordPress-GitHub-Plugin-Updater/issues/2 and https://github.com/jkudish/WordPress-GitHub-Plugin-Updater/issues/4 for details
      'requires' => '3.0', // which version of WordPress does your plugin require?
      'tested' => '3.3',  // which version of WordPress is your plugin tested up to?
      'readme' => 'README.md', // which file to use as the readme for the version number
      'access_token' => '', // Access private repositories by authorizing under Plugins > GitHub Updates when this example plugin is installed
    );

    new WP_GitHub_Updater( $config );

  }

}

class SoliAdmin {

}

$soliAdmin = new SoliAdmin();


