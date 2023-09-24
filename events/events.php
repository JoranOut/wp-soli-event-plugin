<?php

/*
  Description: Events
*/

add_filter( 'block_categories_all' , function( $categories ) {

  // Adding a new category.
  $categories[] = array(
    'slug'  => 'soli',
    'title' => 'soli'
  );

  return $categories;
} );

require_once 'lib/events_date_table.php';
require_once 'lib/events_endpoints.php';
require_once 'lib/post_type.php';
require_once 'blocks/create-event/index.php';
require_once 'blocks/event-view-monthly/index.php';
require_once 'blocks/event-view-list/index.php';
