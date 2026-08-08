<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit; // Exit if accessed directly

/**
 * Resolves a location row (name + free-text address) to map coordinates for
 * the event-location-map block. Geocodes via the public Nominatim API and
 * caches the result on the location row (latitude / longitude /
 * geocoded_address), so each address is geocoded at most once — Nominatim's
 * usage policy requires result caching and an identifying User-Agent.
 * Failed lookups are backed off with a transient so a bad address does not
 * trigger a remote call on every page view.
 */
class LocationGeocoder {

  const FAIL_BACKOFF = 6 * HOUR_IN_SECONDS;

  /**
   * @param array|null $location row from LocationTableHandler::getLocationById()
   * @return array|null ['lat' => float, 'lng' => float]
   */
  public static function coordinatesFor($location) {
    if (empty($location) || !is_array($location)) {
      return null;
    }

    $query = trim((string) ($location['address'] ?? ''));
    if ($query === '') {
      // No address on file; a bare venue name is a long shot but worth a try.
      $query = trim((string) ($location['name'] ?? ''));
    }
    if ($query === '') {
      return null;
    }

    if (isset($location['latitude'], $location['longitude'])
        && ($location['geocoded_address'] ?? '') === $query) {
      return array('lat' => (float) $location['latitude'], 'lng' => (float) $location['longitude']);
    }

    // Venues without a wp_event_location row (the block's home venue for
    // internal dates) cache their result in an option instead.
    $cache_key = 'soli_event_geocode_' . md5($query);
    if (empty($location['id'])) {
      $cached = get_option($cache_key);
      if (is_array($cached) && isset($cached['lat'], $cached['lng'])) {
        return array('lat' => (float) $cached['lat'], 'lng' => (float) $cached['lng']);
      }
    }

    $fail_key = 'soli_event_geocode_fail_' . md5($query);
    if (get_transient($fail_key)) {
      return null;
    }

    $coords = self::geocode($query);
    if (!$coords) {
      set_transient($fail_key, 1, self::FAIL_BACKOFF);
      return null;
    }

    if (!empty($location['id'])) {
      (new LocationTableHandler())->updateCoordinates($location['id'], $coords['lat'], $coords['lng'], $query);
    } else {
      update_option($cache_key, $coords, false);
    }
    return $coords;
  }

  /**
   * @return array|null ['lat' => float, 'lng' => float]
   */
  public static function geocode($query) {
    // Short-circuit hook for tests or an alternative geocoding provider.
    $pre = apply_filters('soli_event_pre_geocode', null, $query);
    if (is_array($pre) && isset($pre['lat'], $pre['lng'])) {
      return array('lat' => (float) $pre['lat'], 'lng' => (float) $pre['lng']);
    }

    $url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' . rawurlencode($query);
    $response = wp_remote_get($url, array(
      'timeout' => 5,
      'headers' => array(
        'User-Agent' => 'wp-soli-event-plugin/' . SOLI_EVENT__PLUGIN_VERSION . ' (' . home_url('/') . ')',
        'Accept'     => 'application/json',
      ),
    ));
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
      return null;
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($data[0]['lat']) || empty($data[0]['lon'])) {
      return null;
    }
    return array('lat' => (float) $data[0]['lat'], 'lng' => (float) $data[0]['lon']);
  }

}
