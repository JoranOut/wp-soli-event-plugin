<?php

add_action('rest_api_init', 'soli_location_rest_api', 10, 1);
function soli_location_rest_api() {
  buildGETSearchLocation();
  buildPOSTCreateLocation();
}

function buildGETSearchLocation() {
  register_rest_route('soli_event/v1', '/location/search', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true', // *always set a permission callback
    'callback' => function ($request) {
      $query = $request->get_param('query');
      $limit = $request->get_param('limit');

      $eventHandler = new \Soli\Events\LocationTableHandler();
      $dates = $eventHandler->searchLocation($query, $limit);
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
 *    name: string,
 *    address: string
 *  }
 */
function buildPOSTCreateLocation() {
  register_rest_route('soli_event/v1', '/location(?:/(?P<id>\d+))?', array(
    'methods' => 'POST',
    'permission_callback' => function () {
      return current_user_can('edit_posts');
    }, // *always set a permission callback
    'callback' => function ($request) {
      $eventHandler = new \Soli\Events\LocationTableHandler();
      $body = json_decode($request->get_body());

      if (!isset($body->name) || !isset($body->address)) {
        return new WP_REST_Response(array(
          'code' => WP_REST_Server::INVALID_ARGUMENT,
          'message' => 'Invalid request arguments.',
        ), 400);
      }


      $location = $eventHandler->persistLocation($request['id'], $body);
      $response = new WP_REST_Response($location);
      if (!$location) {
        $response->set_status(204);
      } else {
        $response->set_status(200);
      }
      return $response;
    },
  ));
}
