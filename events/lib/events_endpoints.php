<?php

add_action('rest_api_init', 'soli_event_rest_api', 10, 1);
function soli_event_rest_api() {
  buildGETEventsBetweenDates();
  buildGETEventDatesFromEvent();
  buildGETFutureEventsByPageAndItemsPerPage();
  buildGETFeedCategories();
  buildPOSTEventDates();
}

// Categories assigned to published events, for the calendar-subscribe block's
// editor UI. Public read (the same data is server-rendered on the front end).
function buildGETFeedCategories() {
  register_rest_route('soli_event/v1', '/feed-categories', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true', // *always set a permission callback
    'callback' => function () {
      $eventHandler = new \Soli\Events\EventsDatesTableHandler();
      $categories = $eventHandler->getFeedCategories();
      $categories = array_map(function ($cat) {
        return array(
          'id'   => (int) $cat['term_id'],
          'name' => $cat['name'],
          'slug' => $cat['slug'],
        );
      }, is_array($categories) ? $categories : array());
      return new WP_REST_Response($categories, 200);
    },
  ));
}

function buildGETEventsBetweenDates() {
  register_rest_route('soli_event/v1', '/events', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true', // *always set a permission callback
    'callback' => function ($request) {
      try {
        $startDate = validateDate($request->get_param('start_date'));
        $endDate = validateDate($request->get_param('end_date'));
      } catch (Exception $e) {
        return new WP_REST_Response(array(
          'code' => WP_REST_Server::INVALID_ARGUMENT,
          'message' => __('Invalid request arguments.', 'soli-event'),
        ), 400);
      }

      $eventHandler = new \Soli\Events\EventsDatesTableHandler();
      $dates = $eventHandler->getEventsBetweenDates($startDate, $endDate);
      $response = new WP_REST_Response($dates);
      if (!$dates) {
        $response->set_status(204);
      } else {
        $response->set_status(200);
      }
      return $response;
    },
  ));
}

function buildGETEventDatesFromEvent() {
  register_rest_route('soli_event/v1', '/events/(?P<id>\d+)', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true', // *always set a permission callback
    'callback' => function ($request) {
      $eventHandler = new \Soli\Events\EventsDatesTableHandler();
      $dates = $eventHandler->getDatesFromEvent($request['id']);
      // Filter workflow-state dates for non-editors (F2): anonymous/subscriber
      // only see PUBLIC/PRIVATE; editors see everything.
      if (is_array($dates)) {
        $dates = \Soli\Events\EventVisibility::filterVisibleRows($dates);
      }
      $response = new WP_REST_Response($dates);
      filterAdminNotesFromDatesIfNoPermission($response);
      if (!$dates) {
        $response->set_status(204);
      } else {
        $response->set_status(200);
      }
      return $response;
    },
  ));
}

function buildGETFutureEventsByPageAndItemsPerPage() {
  register_rest_route('soli_event/v1', '/events/future/(?P<page>\d+)/(?P<itemsPerPage>\d+)', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true', // *always set a permission callback
    'callback' => function ($request) {
      $eventHandler = new \Soli\Events\EventsDatesTableHandler();
      $events = $eventHandler->getFutureDatesPerPageFromEvent($request['page'], $request['itemsPerPage']);
      $totalEvents = $eventHandler->getTotalFutureEvents();
      $totalPages = ceil($totalEvents / $request['itemsPerPage']);

      insertFeaturedImage($events);

      $response = new WP_REST_Response(array(
        'events' => $events,
        'totalEvents' => $totalEvents,
        'totalPages' => $totalPages,
      ));
      if (!$events) {
        $response->set_status(204);
      } else {
        $response->set_status(200);
      }
      return $response;
    },
  ));
}


/**
 * param: {
 *    id: int
 * }
 * body:
 *  {
 *    dates: {
 *      main: #date,
 *      repeated: [#data]
 *    }
 *  }
 * #date: {
 *  id ?: int,
 *  start_date: date,
 *  end_date: date,
 * }
 */
function buildPOSTEventDates() {
  register_rest_route('soli_event/v1', '/events/(?P<id>\d+)', array(
    'methods' => 'POST',
    'permission_callback' => function () {
      return current_user_can('edit_posts');
    }, // *always set a permission callback
    'callback' => function ($request) {
      $body = json_decode($request->get_body());
      // Shared write path with the post-save transport meta, so changes made
      // through this endpoint land in the change log too.
      $dates = \Soli\Events\soli_event_apply_dates($request['id'], $body);
      $response = new WP_REST_Response($dates);
      filterAdminNotesFromDatesIfNoPermission($response);
      if (!$dates) {
        $response->set_status(204);
      } else {
        $response->set_status(200);
      }
      return $response;
    },
  ));
}

/**
 * @throws Exception
 */
function validateDate($date): ?DateTime {
  if (empty($date)) {
    return null;
  }

  $datetime = DateTime::createFromFormat('Y-m-d', $date);

  if ($datetime) {
    // The date string is valid.
    return $datetime;
  } else {
    // The date string is invalid.
    throw new Exception();
  }
}


/**
 * @throws Exception
 */
function validateMonth($date): DateTime {
  if (empty($date)) {
    throw new Exception();
  }

  $datetime = DateTime::createFromFormat('Y-m', $date);

  if ($datetime) {
    // The date string is valid.
    return $datetime;
  } else {
    // The date string is invalid.
    throw new Exception();
  }
}

function insertFeaturedImage(&$dates) {
  if (!isset($dates)) {
    return;
  }
  foreach ($dates as &$date) {
    if (isset($date['featured_image_id'])) {
      $img = wp_get_attachment_image_src($date['featured_image_id'], 'thumbnail');
      if (isset($img)) {
        $date['featured_image'] = $img[0];
      }
    }
  }
}


function validateStatii($dates): bool {
  if (!isset($dates)) {
    return true;
  }
  foreach ($dates as &$date) {
    if (!validateStatii($date["status"])) {
      return false;
    }
  }
  return true;
}

function validateStatus($status): bool {
  $statii = array("PLANNED", "PENDING_APPROVAL", "PUBLIC", "PRIVATE");
  return in_array($status, $statii);
}

function filterAdminNotesFromDatesIfNoPermission($response) {
  if (current_user_can('soli_event_admin_notes')) {
    return;
  }

  $data = $response->get_data();
  if (!is_array($data)) {
    return;
  }

  foreach ($data as &$date) {
    if (is_array($date)) {
      unset($date['admin_notes']);
    } elseif (is_object($date)) {
      unset($date->admin_notes);
    }
  }
  unset($date);

  $response->set_data($data);
}
