<?php

/*
  Plugin Name: Soli Plugin Admin
  Version: 1.0
  Author: Joran Out
*/

require_once 'lib/virtual-page/VirtualPagesSetup.php';
require_once 'lib/virtual-page/PageInterface.php';
require_once 'events/events.php';
use Soli\VirtualPages\VirtualPagesSetup;
use Soli\VirtualPages\PageInterface;
use Soli\Events\EventsDatesTableCreation;

if (!defined('ABSPATH')) exit; // Exit if accessed directly
define( 'SOLI_ADMIN__PLUGIN_DIR_PATH', plugin_dir_path( __FILE__ ) );
define( 'SOLI_ADMIN__PLUGIN_DIR_URL', plugin_dir_url( __FILE__ ) );

register_activation_hook( __FILE__, "onActivate" );
function onActivate(){
  $eventsDatesTableHandler = new Soli\Events\EventsDatesTableHandler();
  $eventsDatesTableHandler->createTable();
  flush_rewrite_rules();
}

class SoliAdmin {
  function __construct() {
    $this->createPages();
  }

  function createPages() {
    new Soli\VirtualPages\VirtualPagesSetup();
    add_action( 'soli_virtual_pages', function( $controller ) {

      $controller->addPage( new \Soli\VirtualPages\Page( '/admin' ) )
        ->setTitle( "Dashboard" )
        ->setTemplate( 'dashboard.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/users/overview" ) )
        ->setTitle( "Users | Overview" )
        ->setTemplate( 'users-overview.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/users/email" ) )
        ->setTitle( "Users | Email" )
        ->setTemplate( 'users-email.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/users/organisation" ) )
        ->setTitle( "Users | Organisation" )
        ->setTemplate( 'dashboard.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/news" ) )
        ->setTitle( "News" )
        ->setTemplate( 'news-overview.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/events" ) )
        ->setTitle( "Events" )
        ->setTemplate( 'events-overview.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/pages/overview" ) )
        ->setTitle( "Pages | Overview" )
        ->setTemplate( 'pages-overview.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/pages/menu" ) )
        ->setTitle( "Pages | Menu" )
        ->setTemplate( 'pages-menu.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/tv/overview" ) )
        ->setTitle( "TV |Overview" )
        ->setTemplate( 'tv-overview.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/tv/settings" ) )
        ->setTitle( "TV | Settings" )
        ->setTemplate( 'dashboard.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/theme/front-page" ) )
        ->setTitle( "Theme | Front-page" )
        ->setTemplate( 'dashboard.php' );

      $controller->addPage( new \Soli\VirtualPages\Page( "/admin/theme/standard-photos" ) )
        ->setTitle( "Theme | Standard Photo's" )
        ->setTemplate( 'dashboard.php' );
    } );
  }
}

$soliAdmin = new SoliAdmin();

add_action( 'wp_enqueue_scripts', function () {
  global $wp_query;

  if (
    is_page()
    && isset( $wp_query->virtual_page )
    && $wp_query->virtual_page instanceof \Soli\VirtualPages\PageInterface
  ) {

    $url = $wp_query->virtual_page->getUrl();
    wp_enqueue_style( 'soli_admin_style', SOLI_ADMIN__PLUGIN_DIR_URL.'/inc/assets/styles/styles.css');
    wp_enqueue_style( 'soli_admin_header_style', SOLI_ADMIN__PLUGIN_DIR_URL.'/inc/assets/styles/header.css');
    wp_enqueue_style( 'soli_admin_searchbar_style', SOLI_ADMIN__PLUGIN_DIR_URL.'/inc/assets/styles/searchbar.css');

    wp_enqueue_style( 'soli_admin_sidebar_style', SOLI_ADMIN__PLUGIN_DIR_URL.'/inc/assets/styles/sidebar.css');
    wp_enqueue_script( 'soli_admin_sidebar_script', SOLI_ADMIN__PLUGIN_DIR_URL.'/inc/assets/scripts/sidebar.js');

    wp_enqueue_style( 'soli_admin_applications_style', SOLI_ADMIN__PLUGIN_DIR_URL.'/inc/assets/styles/applications.css');
    wp_enqueue_script( 'soli_admin_applications_script', SOLI_ADMIN__PLUGIN_DIR_URL.'/inc/assets/scripts/applications.js');

    wp_enqueue_style( 'soli_admin_table_style', SOLI_ADMIN__PLUGIN_DIR_URL.'/inc/assets/styles/table.css');

    switch ( $url ) {
      case '/custom/page' :
//        wp_enqueue_script( 'a_script', $a_script_url );
//        wp_enqueue_style( 'a_style', $a_style_url );
        break;
      case '/custom/page/deep' :
//        wp_enqueue_script( 'another_script', $another_script_url );
//        wp_enqueue_style( 'another_style', $another_style_url );
        break;
    }
  }

});


function custom_link_injection_to_gutenberg_toolbar(){
  // Here you can also check several conditions,
  // for example if you want to add this link only on CPT  you can
  $screen= get_current_screen();
  // and then
  if ( 'post' === $screen->post_type || 'page' === $screen->post_type || 'soli_event' === $screen->post_type ){
    wp_enqueue_script( 'custom-link-in-toolbar', SOLI_ADMIN__PLUGIN_DIR_URL . '/inc/assets/scripts/custom-link-in-toolbar.js', array(), '1.0', true );
  }
}
add_action( 'enqueue_block_editor_assets', 'custom_link_injection_to_gutenberg_toolbar' );


