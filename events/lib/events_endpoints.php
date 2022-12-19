<?php
add_action('rest_api_init', 'soli_event_rest_api', 10, 1);
function soli_event_rest_api() {
  register_rest_route('soli_event', '/event/(?P<id>\d+)', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true', // *always set a permission callback
    'callback' => function ($request) {
      $eventHandler = new \Soli\Events\EventsDatesTableHandler();
      $dates = $eventHandler->getDatesFromEvent($request['id']);
      $response = new WP_REST_Response($dates);
      if (!$dates){
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
  register_rest_route('soli_event', '/event/(?P<id>\d+)', array(
    'methods' => 'POST',
    'permission_callback' => function () {
      return current_user_can('edit_posts');
    }, // *always set a permission callback
    'callback' => function ($request) {
      $eventHandler = new \Soli\Events\EventsDatesTableHandler();
      $body = json_decode($request->get_body());
      $dates =  $eventHandler->setDatesAtEvent($request['id'], $body);
      $response = new WP_REST_Response($dates);
      if (!$dates){
        $response->set_status(204);
      } else {
        $response->set_status(200);
      }
      return $response;
    },
  ));
}

