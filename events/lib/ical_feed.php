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
 * - Filter by category with ?categorie=<slug|id> (alias: ?category=). An unknown
 *   category yields an empty (valid) calendar rather than the full agenda.
 *
 * URL: /ical  and  /ical?categorie=concerten
 */

const ICAL_QUERY_VAR = 'soli_event_ical';
// Bump when the rewrite rule changes to trigger a one-time flush on deploy.
const ICAL_REWRITE_VERSION = '1';

add_action('init', 'Soli\Events\soli_events_register_ical_rewrite');
function soli_events_register_ical_rewrite() {
  add_rewrite_rule('^ical/?$', 'index.php?' . ICAL_QUERY_VAR . '=1', 'top');

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
  if (!get_query_var(ICAL_QUERY_VAR)) {
    return;
  }

  // Resolve the optional category filter (slug or numeric id).
  $requested = '';
  if (isset($_GET['categorie']) && $_GET['categorie'] !== '') {
    $requested = wp_unslash($_GET['categorie']);
  } elseif (isset($_GET['category']) && $_GET['category'] !== '') {
    $requested = wp_unslash($_GET['category']);
  }

  $category_id = 0;
  $unknown_category = false;
  if ($requested !== '') {
    $term = ctype_digit((string) $requested)
      ? get_term((int) $requested, 'category')
      : get_term_by('slug', sanitize_title($requested), 'category');
    if ($term && !is_wp_error($term)) {
      $category_id = (int) $term->term_id;
    } else {
      $unknown_category = true;
    }
  }

  $handler = new EventsDatesTableHandler();
  $rows = $unknown_category ? array() : $handler->getPublicFutureDatesForFeed($category_id);

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

function soli_events_output_ical(array $rows) {
  $lines = array(
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//soli.nl//Soli Event Plugin//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' . soli_events_ical_escape_text(get_bloginfo('name') . ' - ' . __('Agenda', 'soli-event')),
  );

  foreach ($rows as $row) {
    $post_id  = (int) ($row['post_id'] ?? 0);
    $start    = soli_events_ical_utc($row['start_date']);
    $end      = !empty($row['end_date']) ? soli_events_ical_utc($row['end_date']) : $start;
    $stamp    = !empty($row['post_modified_gmt']) && $row['post_modified_gmt'] !== '0000-00-00 00:00:00'
      ? soli_events_ical_utc($row['post_modified_gmt'], true)
      : gmdate('Ymd\THis\Z');

    // Location: named venue if set, otherwise the home venue.
    if (!empty($row['location_name'])) {
      $location = $row['location_name'];
      if (!empty($row['location_address'])) {
        $location .= ', ' . $row['location_address'];
      }
    } else {
      $location = 'Muziekcentrum Soli';
    }

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
  header('Content-Disposition: inline; filename=soli-agenda.ics');
  echo $body; // phpcs:ignore WordPress.Security.EscapeOutput -- iCal body, values escaped per RFC 5545
  exit;
}
