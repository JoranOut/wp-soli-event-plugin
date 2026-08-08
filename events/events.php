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

require_once 'lib/event_capability.php';
require_once 'lib/event_visibility.php';
require_once 'lib/location_table.php';
require_once 'lib/migrations.php';
require_once 'lib/location_geocoder.php';
require_once 'lib/location_endpoints.php';
require_once 'lib/events_date_table.php';
require_once 'lib/events_log_table.php';
require_once 'lib/events_save.php';
require_once 'lib/events_endpoints.php';
require_once 'lib/events_admin_table.php';
require_once 'lib/post_type.php';
require_once 'lib/post_type_query.php';
require_once 'lib/single_event_template.php';
require_once 'lib/ical_feed.php';
require_once 'lib/events_admin_view_page.php';
require_once 'lib/events_admin_log_page.php';
require_once 'lib/plugin_settings_page.php';
require_once 'lib/category_onderdeel.php';
require_once 'inc/values.php';
require_once 'blocks/create-event/index.php';
require_once 'blocks/event-view-calendar/index.php';
require_once 'blocks/event-view-list/index.php';
require_once 'blocks/event-reservation-popup/index.php';
require_once 'blocks/concert-hero/index.php';
require_once 'blocks/next-concert/index.php';
require_once 'blocks/event-dates/index.php';
require_once 'blocks/event-location-map/index.php';
require_once 'blocks/calendar-subscribe/index.php';
require_once 'blocks/my-groups/index.php';
