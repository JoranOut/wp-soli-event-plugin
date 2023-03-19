<?php


add_action('rest_api_init', 'soli_event_rest_api', 10, 1);
function soli_event_rest_api() {

  // get events between to dates
  register_rest_route('soli_event', '/events', array(
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

  // get events of a month
  register_rest_route('soli_event', '/events/(?P<yearmonth>\d{4}-\d{1,2})/', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true', // *always set a permission callback
    'callback' => function ($request) {
      try {
        $ym = validateMonth($request['yearmonth']);
      } catch (Exception $e) {
        return new WP_REST_Response(array(
          'code' => WP_REST_Server::INVALID_ARGUMENT,
          'message' => 'Invalid request arguments.',
        ), 400);
      }

      $eventHandler = new \Soli\Events\EventsDatesTableHandler();
      $dates = $eventHandler->getDatesForMonth($ym);
      foreach ($dates as &$date) {
        if (isset($date['featured_image_id'])) {
          $img = wp_get_attachment_image_src($date['featured_image_id'], 'thumbnail');
          if(isset($img)){
            $date['featured_image'] = $img[0];
          }
        }
      }
      $response = new WP_REST_Response($dates);
      if (!$dates) {
        $response->set_status(204);
      } else {
        $response->set_status(200);
      }
      return $response;
    },
  ));

  // get event by ID
  register_rest_route('soli_event', '/events/(?P<id>\d+)', array(
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
   *  date: date,
   *  startTime: time,
   *  endTime: time,
   * }
   */
  register_rest_route('soli_event', '/events/(?P<id>\d+)', array(
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
 * @throws Exception
 */
function validateDate($date) {
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
function validateMonth($date) {
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
