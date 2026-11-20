<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit; // Exit if accessed directly

/**
 * Public iCal feed at /ical (RFC 5545 VCALENDAR), for subscribing external
 * calendar apps to Soli's agenda.
 *
 * - Strictly PUBLIC data only: published events with a PUBLIC, upcoming date.
 *   PRIVATE and workflow-state dates (PENDING_APPROVAL/PLANNED/OPTION) are never
 *   exported. There is no per-user/authenticated variant.
 * - Filter by category with ?categorie=<slug|id> (alias: ?category=). Accepts a
 *   comma-separated list (OR: an event matches if it is in any of them). Unknown
 *   categories are dropped; a request of only-unknowns yields an empty (valid)
 *   calendar rather than the full agenda.
 * - Filter to concerts with ?concerten=1 (alias: ?concerts=1), matching dates
 *   flagged is_concert. OR-combined with the category filter.
 *
 * URL: /ical
 *      /ical?categorie=harmonie,bigband
 *      /ical?concerten=1
 *      /ical?concerten=1&categorie=harmonie   (concerts OR Harmonie)
 *
 * Building feed at /ical/gebouw?token=<secret>: every upcoming PUBLIC and
 * PRIVATE date in Soli's own building (no external location), with real titles
 * and the booked rooms, for heating control. ?zaal=<room slug>[,...] narrows to
 * dates booking any of those rooms. The token lives in the plugin settings.
 */

const ICAL_QUERY_VAR = 'soli_event_ical';
// Bump when the rewrite rule changes to trigger a one-time flush on deploy.
const ICAL_REWRITE_VERSION = '2';
const ICAL_BUILDING = 'gebouw';
const BUILDING_FEED_TOKEN_OPTION = 'soli_event_building_feed_token';
const SOLI_EVENT_HOME_VENUE = 'Muziekcentrum Soli';

add_action('init', 'Soli\Events\soli_events_register_ical_rewrite');
function soli_events_register_ical_rewrite() {
  add_rewrite_rule('^ical/?$', 'index.php?' . ICAL_QUERY_VAR . '=1', 'top');
  add_rewrite_rule('^ical/' . ICAL_BUILDING . '/?$', 'index.php?' . ICAL_QUERY_VAR . '=' . ICAL_BUILDING, 'top');

  // Register the rule the first time this version loads (activation also flushes,
  // but plugin *updates* don't re-run activation).
  if (get_option('soli_event_ical_rewrite') !== ICAL_REWRITE_VERSION) {
    flush_rewrite_rules(false);
    update_option('soli_event_ical_rewrite', ICAL_REWRITE_VERSION);
  }
}

add_filter('query_vars', 'Soli\Events\soli_events_ical_query_var');
function soli_events_ical_query_var($vars) {
  $vars[] = ICAL_QUERY_VAR;
  return $vars;
}

add_action('template_redirect', 'Soli\Events\soli_events_maybe_render_ical');
function soli_events_maybe_render_ical() {
  $feed = get_query_var(ICAL_QUERY_VAR);
  if (!$feed) {
    return;
  }
  if ($feed === ICAL_BUILDING) {
    soli_events_render_building_ical();
    return;
  }

  // Resolve the optional category filter. Accepts a single slug/numeric id or a
  // comma-separated list (OR: an event matches if it is in any of them).
  $requested = '';
  if (isset($_GET['categorie']) && $_GET['categorie'] !== '') {
    $requested = wp_unslash($_GET['categorie']);
  } elseif (isset($_GET['category']) && $_GET['category'] !== '') {
    $requested = wp_unslash($_GET['category']);
  }

  $category_ids = array();
  $category_requested = false;
  foreach (explode(',', (string) $requested) as $value) {
    $value = trim($value);
    if ($value === '') {
      continue;
    }
    $category_requested = true;
    $term = ctype_digit($value)
      ? get_term((int) $value, 'category')
      : get_term_by('slug', sanitize_title($value), 'category');
    if ($term && !is_wp_error($term)) {
      $category_ids[] = (int) $term->term_id;
    }
  }

  // Optional concerts filter (?concerten=1, alias ?concerts=1). OR-combined with
  // the category filter: e.g. ?concerten=1&categorie=harmonie => concerts OR Harmonie.
  $concerts_only = false;
  if (isset($_GET['concerten'])) {
    $concerts_only = filter_var(wp_unslash($_GET['concerten']), FILTER_VALIDATE_BOOLEAN);
  } elseif (isset($_GET['concerts'])) {
    $concerts_only = filter_var(wp_unslash($_GET['concerts']), FILTER_VALIDATE_BOOLEAN);
  }

  // A category filter was requested but nothing resolved, and concerts weren't
  // requested either -> empty calendar (unknown categories are simply dropped;
  // a request of only-unknowns yields nothing). The concerts flag is always a
  // valid condition on its own, so it never triggers the empty case.
  $handler = new EventsDatesTableHandler();
  $rows = ($category_requested && !$category_ids && !$concerts_only)
    ? array()
    : $handler->getPublicFutureDatesForFeed($category_ids, $concerts_only);

  soli_events_output_ical(is_array($rows) ? $rows : array());
}

/** Escape a text value per RFC 5545 (backslash, comma, semicolon, newlines). */
function soli_events_ical_escape_text($text) {
  $text = wp_strip_all_tags((string) $text);
  $text = str_replace('\\', '\\\\', $text);
  $text = str_replace(array(',', ';'), array('\\,', '\\;'), $text);
  $text = preg_replace('/\r\n|\r|\n/', '\\n', $text);
  return trim($text);
}

/** Fold a content line to <=75 octets with CRLF + single-space continuation. */
function soli_events_ical_fold($line) {
  if (strlen($line) <= 75) {
    return $line;
  }
  $out = '';
  while (strlen($line) > 75) {
    $out .= substr($line, 0, 75) . "\r\n ";
    $line = substr($line, 75);
  }
  return $out . $line;
}

/** Convert a stored (site-timezone) datetime string to iCal UTC (Ymd\THis\Z). */
function soli_events_ical_utc($datetime, $assume_utc = false) {
  try {
    $tz = $assume_utc ? new \DateTimeZone('UTC') : wp_timezone();
    $dt = new \DateTime($datetime, $tz);
    $dt->setTimezone(new \DateTimeZone('UTC'));
    return $dt->format('Ymd\THis\Z');
  } catch (\Exception $e) {
    return gmdate('Ymd\THis\Z');
  }
}

function soli_events_output_ical(array $rows, array $args = array()) {
  $args = wp_parse_args($args, array(
    'name'     => get_bloginfo('name') . ' - ' . __('Agenda', 'soli-event'),
    'filename' => 'soli-agenda.ics',
    'location' => 'Soli\Events\soli_events_ical_venue_location',
    'refresh'  => '',
  ));

  $lines = array(
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//soli.nl//Soli Event Plugin//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' . soli_events_ical_escape_text($args['name']),
  );
  if ($args['refresh']) {
    $lines[] = 'REFRESH-INTERVAL;VALUE=DURATION:' . $args['refresh'];
    $lines[] = 'X-PUBLISHED-TTL:' . $args['refresh'];
  }

  foreach ($rows as $row) {
    $post_id  = (int) ($row['post_id'] ?? 0);
    $start    = soli_events_ical_utc($row['start_date']);
    $end      = !empty($row['end_date']) ? soli_events_ical_utc($row['end_date']) : $start;
    $stamp    = !empty($row['post_modified_gmt']) && $row['post_modified_gmt'] !== '0000-00-00 00:00:00'
      ? soli_events_ical_utc($row['post_modified_gmt'], true)
      : gmdate('Ymd\THis\Z');

    $location = call_user_func($args['location'], $row);

    // Description: date-specific notes, else the event excerpt/content.
    $description = !empty($row['notes'])
      ? $row['notes']
      : (!empty($row['post_excerpt']) ? $row['post_excerpt'] : wp_trim_words((string) ($row['post_content'] ?? ''), 40, ''));

    $url = $post_id ? get_permalink($post_id) : home_url('/');

    $lines[] = 'BEGIN:VEVENT';
    $lines[] = 'UID:' . ((int) ($row['id'] ?? $post_id)) . '@soli.nl';
    $lines[] = 'DTSTAMP:' . $stamp;
    $lines[] = 'DTSTART:' . $start;
    $lines[] = 'DTEND:' . $end;
    $lines[] = 'SUMMARY:' . soli_events_ical_escape_text($row['post_title'] ?? '');
    $lines[] = 'LOCATION:' . soli_events_ical_escape_text($location);
    if ($description !== '') {
      $lines[] = 'DESCRIPTION:' . soli_events_ical_escape_text($description);
    }
    if ($url) {
      $lines[] = 'URL:' . esc_url_raw($url);
    }
    $lines[] = 'END:VEVENT';
  }

  $lines[] = 'END:VCALENDAR';

  $body = '';
  foreach ($lines as $line) {
    $body .= soli_events_ical_fold($line) . "\r\n";
  }

  nocache_headers();
  header('Content-Type: text/calendar; charset=utf-8');
  header('Content-Disposition: inline; filename=' . $args['filename']);
  echo $body; // phpcs:ignore WordPress.Security.EscapeOutput -- iCal body, values escaped per RFC 5545
  exit;
}

/** Named venue if set, otherwise the home venue. */
function soli_events_ical_venue_location(array $row) {
  if (empty($row['location_name'])) {
    return SOLI_EVENT_HOME_VENUE;
  }
  $location = $row['location_name'];
  if (!empty($row['location_address'])) {
    $location .= ', ' . $row['location_address'];
  }
  return $location;
}

/** Home venue plus the booked rooms, e.g. "Muziekcentrum Soli - Grote zaal, Studio 1". */
function soli_events_ical_room_location(array $row) {
  $slugs = json_decode((string) ($row['rooms'] ?? ''), true);
  $slugs = is_array($slugs) ? $slugs : array();
  $names = array();
  foreach (SOLI_ROOM_SLUGS as $index => $slug) {
    if (in_array($slug, $slugs, true)) {
      $names[] = SOLI_ROOM_NAMES[$index];
    }
  }
  return $names ? SOLI_EVENT_HOME_VENUE . ' - ' . implode(', ', $names) : SOLI_EVENT_HOME_VENUE;
}

/** The building-feed secret, created on first use. */
function soli_events_building_feed_token() {
  $token = get_option(BUILDING_FEED_TOKEN_OPTION);
  if (!$token) {
    $token = soli_events_regenerate_building_feed_token();
  }
  return $token;
}

function soli_events_regenerate_building_feed_token() {
  $token = wp_generate_password(32, false);
  update_option(BUILDING_FEED_TOKEN_OPTION, $token, false);
  return $token;
}

function soli_events_building_feed_url() {
  return add_query_arg('token', soli_events_building_feed_token(), home_url('/ical/' . ICAL_BUILDING . '/'));
}

function soli_events_render_building_ical() {
  $expected = (string) get_option(BUILDING_FEED_TOKEN_OPTION);
  $given    = isset($_GET['token']) ? (string) wp_unslash($_GET['token']) : '';
  if ($expected === '' || !hash_equals($expected, $given)) {
    status_header(403);
    nocache_headers();
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Forbidden';
    exit;
  }

  // Unknown room slugs are dropped; only-unknowns yields an empty calendar.
  $room_slugs     = array();
  $room_requested = false;
  $requested      = isset($_GET['zaal']) ? (string) wp_unslash($_GET['zaal']) : '';
  foreach (explode(',', $requested) as $value) {
    $value = sanitize_title(trim($value));
    if ($value === '') {
      continue;
    }
    $room_requested = true;
    if (in_array($value, SOLI_ROOM_SLUGS, true)) {
      $room_slugs[] = $value;
    }
  }

  $handler = new EventsDatesTableHandler();
  $rows = ($room_requested && !$room_slugs)
    ? array()
    : $handler->getBuildingFutureDatesForFeed(array_unique($room_slugs));

  header('X-Robots-Tag: noindex, nofollow');
  soli_events_output_ical(is_array($rows) ? $rows : array(), array(
    'name'     => SOLI_EVENT_HOME_VENUE . ' - ' . __('Bookings', 'soli-event'),
    'filename' => 'soli-gebouw.ics',
    'location' => 'Soli\\Events\\soli_events_ical_room_location',
    'refresh'  => 'PT15M',
  ));
}
