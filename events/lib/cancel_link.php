<?php

namespace Soli\Events;

use WP_Error;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Secret per-event link that lets someone without an account cancel (and restore) dates of one event.
 * The token is a random UUID in protected post meta; it only ever travels in the link, never in page
 * content. The page holding the soli/event-cancel-dates block reads it from ?token=.
 */
class CancelLink {
  const META_KEY = '_soli_event_cancel_token';
  const QUERY_ARG = 'token';
  const BLOCK = 'soli/event-cancel-dates';
  const TOKEN_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

  /** UUID v4 from the CSPRNG; wp_generate_uuid4() uses mt_rand and is guessable. */
  static function generateToken(): string {
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
  }

  static function isWellFormed($token): bool {
    return is_string($token) && preg_match('/^' . self::TOKEN_PATTERN . '$/D', $token) === 1;
  }

  static function getToken(int $post_id): string {
    $token = get_post_meta($post_id, self::META_KEY, true);
    return self::isWellFormed($token) ? $token : '';
  }

  static function enable(int $post_id): string {
    $token = self::getToken($post_id);
    return $token !== '' ? $token : self::rotate($post_id);
  }

  static function rotate(int $post_id): string {
    $token = self::generateToken();
    update_post_meta($post_id, self::META_KEY, $token);
    return $token;
  }

  static function disable(int $post_id): void {
    delete_post_meta($post_id, self::META_KEY);
  }

  /** Resolves a token to its event, or null. */
  static function findEvent($token) {
    global $wpdb;
    $token = is_string($token) ? strtolower(trim($token)) : '';
    if (!self::isWellFormed($token)) {
      return null;
    }
    $ids = $wpdb->get_col($wpdb->prepare(
      "SELECT post_id FROM $wpdb->postmeta WHERE meta_key = %s AND meta_value = %s LIMIT 2",
      self::META_KEY,
      $token
    ));
    // Two events with one token (a duplicate-post plugin copying meta): refuse rather than guess.
    if (count($ids) !== 1) {
      return null;
    }
    $post_id = (int) $ids[0];
    if (!hash_equals(self::getToken($post_id), $token)) {
      return null;
    }
    $post = get_post($post_id);
    if (!$post || $post->post_type !== 'soli_event' || in_array($post->post_status, array('trash', 'auto-draft'), true)) {
      return null;
    }
    return $post;
  }

  /** First published page with the block: where links point. Filterable for sites with several. */
  static function pageUrl(): string {
    global $wpdb;
    $page_id = (int) $wpdb->get_var($wpdb->prepare(
      "SELECT ID FROM $wpdb->posts WHERE post_status = 'publish' AND post_type = 'page' AND post_content LIKE %s ORDER BY ID LIMIT 1",
      '%' . $wpdb->esc_like('<!-- wp:' . self::BLOCK) . '%'
    ));
    $url = $page_id ? get_permalink($page_id) : '';
    return (string) apply_filters('soli_event_cancel_page_url', $url ?: '');
  }

  static function linkFor(int $post_id): string {
    $token = self::getToken($post_id);
    $page = self::pageUrl();
    return ($token !== '' && $page !== '') ? add_query_arg(self::QUERY_ARG, $token, $page) : '';
  }

  /** Date row as the link page sees it: no notes, rooms or workflow status. */
  static function publicDate(array $row): array {
    $cancelled = $row['status'] === 'CANCELLED';
    return array(
      'id'         => (int) $row['id'],
      'start_date' => $row['start_date'],
      'end_date'   => $row['end_date'],
      'cancelled'  => $cancelled,
      // A date an editor cancelled is not the link holder's to restore.
      'locked'     => $cancelled && !(bool) $row['cancelled_externally'],
    );
  }
}

add_action('rest_api_init', 'Soli\Events\soli_event_cancel_link_routes');
function soli_event_cancel_link_routes() {
  $can_manage = function ($request) {
    $post = get_post((int) $request['id']);
    return $post && $post->post_type === 'soli_event' && current_user_can('edit_post', $post->ID);
  };
  $describe = function (int $post_id) {
    $token = CancelLink::getToken($post_id);
    return array(
      'enabled'  => $token !== '',
      'url'      => CancelLink::linkFor($post_id),
      'has_page' => CancelLink::pageUrl() !== '',
    );
  };

  register_rest_route('soli_event/v1', '/cancel-link/(?P<id>\d+)', array(
    array(
      'methods'             => WP_REST_Server::READABLE,
      'permission_callback' => $can_manage,
      'callback'            => function ($request) use ($describe) {
        return new WP_REST_Response($describe((int) $request['id']));
      },
    ),
    array(
      'methods'             => WP_REST_Server::CREATABLE,
      'permission_callback' => $can_manage,
      'args'                => array(
        'action' => array('required' => true, 'type' => 'string', 'enum' => array('enable', 'rotate', 'disable')),
      ),
      'callback'            => function ($request) use ($describe) {
        $post_id = (int) $request['id'];
        switch ($request['action']) {
          case 'enable':
            CancelLink::enable($post_id);
            break;
          case 'rotate':
            CancelLink::rotate($post_id);
            break;
          case 'disable':
            CancelLink::disable($post_id);
            break;
        }
        return new WP_REST_Response($describe($post_id));
      },
    ),
  ));

  // The token travels in the body, not the route, so it stays out of access logs.
  register_rest_route('soli_event/v1', '/cancel', array(
    'methods'             => WP_REST_Server::CREATABLE,
    // Anyone holding the token; the token is the credential and is checked in the callback.
    'permission_callback' => '__return_true',
    'args'                => array(
      'token'     => array('required' => true, 'type' => 'string'),
      // One date, or every date of a day.
      'date_ids'  => array(
        'required' => true,
        'type'     => 'array',
        'items'    => array('type' => 'integer', 'minimum' => 1),
        'minItems' => 1,
        'maxItems' => 100,
      ),
      'cancelled' => array('required' => true, 'type' => 'boolean'),
    ),
    'callback'            => 'Soli\Events\soli_event_cancel_link_toggle',
  ));
}

function soli_event_cancel_link_toggle($request) {
  $post = CancelLink::findEvent($request['token']);
  if (!$post) {
    return new WP_Error('soli_event_cancel_not_found', __('This link is not valid (anymore).', 'soli-event'), array('status' => 404));
  }
  $handler = new EventsDatesTableHandler();
  $ids = array_values(array_unique(array_map('intval', $request['date_ids'])));
  $current = array();
  foreach ($handler->getDatesForCancelLink($post->ID) as $row) {
    $current[(int) $row['id']] = CancelLink::publicDate($row);
  }
  if (array_diff($ids, array_keys($current))) {
    return new WP_Error('soli_event_cancel_not_found', __('This date does not exist (anymore).', 'soli-event'), array('status' => 404));
  }

  $cancelled = (bool) $request['cancelled'];
  $todo = array();
  $locked = false;
  foreach ($ids as $id) {
    if ($current[$id]['cancelled'] === $cancelled) {
      continue;
    }
    if ($current[$id]['locked']) {
      $locked = true;
    } else {
      $todo[] = $id;
    }
  }
  // Locked dates are skipped when a whole day is toggled, refused when they are all there is.
  if (!$todo && $locked) {
    return new WP_Error('soli_event_cancel_locked', __('Soli cancelled this date. Contact Soli to change it.', 'soli-event'), array('status' => 409));
  }

  if ($todo) {
    $before = $handler->loadEventDatesFromDb($post->ID);
    foreach ($todo as $id) {
      $handler->setCancelledThroughLink($post->ID, $id, $cancelled);
    }
    $after = $handler->loadEventDatesFromDb($post->ID);
    // User 0: the log page shows these as changes made through the link.
    (new EventsLogTableHandler())->logChange($post->ID, 0, $before, $after);
  }

  $dates = array();
  foreach ($ids as $id) {
    $dates[] = CancelLink::publicDate($handler->getDateForCancelLink($post->ID, $id));
  }
  return new WP_REST_Response(array('dates' => $dates));
}

/**
 * The link page carries the secret in its URL: keep it out of caches, search engines and the
 * Referer header sent to anything the page loads or links to.
 */
add_action('template_redirect', 'Soli\Events\soli_event_cancel_page_headers');
function soli_event_cancel_page_headers() {
  if (!is_singular() || !has_block(CancelLink::BLOCK, get_queried_object())) {
    return;
  }
  if (!defined('DONOTCACHEPAGE')) {
    define('DONOTCACHEPAGE', true);
  }
  nocache_headers();
  header('Referrer-Policy: no-referrer');
  header('X-Robots-Tag: noindex, nofollow');
  add_filter('wp_robots', 'wp_robots_no_robots');
}
