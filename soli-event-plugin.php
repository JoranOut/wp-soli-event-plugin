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

class SoliAdmin {

}

$soliAdmin = new SoliAdmin();


