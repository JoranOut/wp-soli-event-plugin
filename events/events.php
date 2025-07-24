<?php

/*
  Description: Events
*/

add_filter( 'block_categories_all' , function( $categories, $post ) {

  // Adding a new category.
  $categories[] = array(
    'slug'  => 'soli',
    'title' => 'soli'
  );

  return $categories;
}, 10, 2);

require_once 'lib/location_table.php';
require_once 'lib/location_endpoints.php';
require_once 'lib/events_date_table.php';
require_once 'lib/events_endpoints.php';
require_once 'lib/events_admin_table.php';
require_once 'lib/post_type.php';
require_once 'lib/post_type_query.php';
require_once 'lib/events_admin_view_page.php';
require_once 'lib/events_admin_log_page.php';
require_once 'lib/plugin_settings_page.php';
require_once 'inc/values.php';
require_once 'blocks/create-event/index.php';
require_once 'blocks/event-view-calendar/index.php';
require_once 'blocks/event-view-list/index.php';
require_once 'blocks/event-reservation-popup/index.php';
require_once 'blocks/get-event-date/index.php';
