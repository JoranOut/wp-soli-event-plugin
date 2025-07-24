<?php

add_action('rest_api_init', 'soli_event_rest_api', 10, 1);
function soli_event_rest_api() {
  buildGETEventsBetweenDates();
  buildGETEventDatesFromEvent();
  buildGETFutureEventsByPageAndItemsPerPage();
  buildPOSTEventDates();
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
          'message' => 'Invalid request arguments.',
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

function buildGETFutureEventsByPageAndItemsPerPage() {
  register_rest_route('soli_event/v1', '/events/future/(?P<page>\d+)/(?P<itemsPerPage>\d+)', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true', // *always set a permission callback
    'callback' => function ($request) {
      $eventHandler = new \Soli\Events\EventsDatesTableHandler();
      $dates = $eventHandler->getFutureDatesPerPageFromEvent($request['page'], $request['itemsPerPage']);

      insertGUID($dates);
      insertFeaturedImage($dates);

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
      $eventHandler = new \Soli\Events\EventsDatesTableHandler();
      $body = json_decode($request->get_body());
      $dates = $eventHandler->setDatesAtEvent($request['id'], $body);
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
function buildPOSTEventLocation() {
  register_rest_route('soli_event/v1', '/location/(?P<id>\d+)', array(
    'methods' => 'POST',
    'permission_callback' => function () {
      return current_user_can('edit_posts');
    }, // *always set a permission callback
    'callback' => function ($request) {
      $eventHandler = new \Soli\Events\EventsLocation();
      $body = json_decode($request->get_body());
      $dates = $eventHandler->setDatesAtEvent($request['id'], $body);
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

function insertGUID(&$dates) {
  if (empty($dates)) {
    return;
  }
  foreach ($dates as &$date) {
    if (isset($date['post_id'])) {
      // Get permalink to the single event page
      $permalink = get_permalink($date['post_id']);

      // Append the 'event' URL parameter
      $url_with_param = add_query_arg('event', $date['id'], $permalink);

      $date['guid'] = esc_url($url_with_param);
    }
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
