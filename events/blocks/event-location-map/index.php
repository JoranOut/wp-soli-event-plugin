<?php

/*
  Description: Map card (Leaflet + OpenStreetMap) showing the location of the
  current event date: the ?event=<date id> date when the visitor followed the
  upcoming-dates list, otherwise the next upcoming date. Hidden on the front
  end when the date has no location or the address cannot be geocoded; editors
  see an explanatory note instead.
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockEventLocationMap {
  function __construct() {
    add_action('init', array($this, 'registerBlock'));
  }

  function registerBlock() {
    $asset = include plugin_dir_path(__FILE__) . 'build/index.asset.php';

    wp_register_style('block-event-location-map-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-event-location-map-js', plugin_dir_url(__FILE__) . 'build/index.js', $asset['dependencies'], $asset['version'], true);
    // frontend.js bundles Leaflet; frontend.css is Leaflet's own stylesheet.
    wp_register_style('block-event-location-map-frontend-css', plugin_dir_url(__FILE__) . 'build/frontend.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-event-location-map-frontend', plugin_dir_url(__FILE__) . 'build/frontend.js', array(), SOLI_EVENT__PLUGIN_VERSION, true);

    register_block_type('soli/event-location-map', array(
      'editor_script'   => 'block-event-location-map-js',
      'editor_style'    => 'block-event-location-map-css',
      'render_callback' => array($this, 'theHTML'),
      'supports'        => array(
        'html' => false,
      ),
      'attributes'      => array(
        'heading'     => array('type' => 'string', 'default' => __('Location', 'soli-event')),
        'zoom'        => array('type' => 'number', 'default' => 15),
        // Venue shown for internal dates (rooms booked, no external location).
        'homeName'    => array('type' => 'string', 'default' => 'Muziekcentrum'),
        'homeAddress' => array('type' => 'string', 'default' => 'Kerkpad 83, Santpoort-Noord'),
        'postId'      => array('type' => 'number'),
        'isPreview'   => array('type' => 'boolean', 'default' => false),
      ),
    ));

    wp_set_script_translations('block-event-location-map-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  // The date whose location the map shows: the ?event=<date id> from the
  // upcoming-dates list when it belongs to this event, otherwise the next
  // upcoming date. Rows arrive pre-filtered by viewer visibility (F1), so a
  // workflow-state date id in the URL never resolves for public viewers.
  private function pickDate($dates) {
    $requested = isset($_GET['event']) ? absint($_GET['event']) : 0;
    if ($requested) {
      foreach ($dates as $date) {
        if ((int) $date['id'] === $requested) {
          return $date;
        }
      }
    }
    return !empty($dates) ? $dates[0] : null;
  }

  // Empty states surface only to editors; the front end stays clean.
  private function editorsOnlyNote($message) {
    if (!current_user_can('edit_posts')) {
      return '';
    }
    return sprintf(
      '<div class="soli-event-location-map soli-event-location-map--empty"><p>%s</p></div>',
      esc_html($message)
    );
  }

  function theHTML($attributes) {
    $heading    = isset($attributes['heading']) ? $attributes['heading'] : __('Location', 'soli-event');
    $zoom       = isset($attributes['zoom']) ? min(18, max(3, absint($attributes['zoom']))) : 15;
    $is_preview = !empty($attributes['isPreview']);

    $post_id = !empty($attributes['postId']) ? absint($attributes['postId']) : 0;
    if (!$post_id) {
      $post_id = get_the_ID();
    }
    if (!$post_id) {
      $post_id = get_queried_object_id();
    }

    // Outside an event there is nothing to resolve - notably the site editor,
    // where the single-event template carries no post context. Distinguish
    // that from a genuine event without upcoming dates.
    if (!$post_id || get_post_type($post_id) !== 'soli_event') {
      return $this->editorsOnlyNote(__('The location map resolves on an event page, where it shows the venue of the current event date.', 'soli-event'));
    }

    $handler = new \Soli\Events\EventsDatesTableHandler();
    $dates   = $handler->getUpcomingDatesForEvent($post_id);
    $date    = $this->pickDate($dates);

    if (!$date) {
      return $this->editorsOnlyNote(__('This event has no upcoming dates, so the location map stays hidden on the front end.', 'soli-event'));
    }
    if (!empty($date['location_id'])) {
      $location = (new \Soli\Events\LocationTableHandler())->getLocationById($date['location_id']);
    } else {
      // Internal date (rooms booked, no external location) -> the home venue.
      $rooms = json_decode((string) $date['rooms'], true);
      if (!is_array($rooms) || !count($rooms)) {
        return $this->editorsOnlyNote(__('No location is set for this event date, so the map stays hidden on the front end.', 'soli-event'));
      }
      $location = array(
        'name'    => isset($attributes['homeName']) ? $attributes['homeName'] : 'Muziekcentrum',
        'address' => isset($attributes['homeAddress']) ? $attributes['homeAddress'] : 'Kerkpad 83, Santpoort-Noord',
      );
    }

    $coords = \Soli\Events\LocationGeocoder::coordinatesFor($location);
    if (!$coords) {
      return $this->editorsOnlyNote(__('The location address could not be found on the map, so the map stays hidden on the front end.', 'soli-event'));
    }

    wp_enqueue_style('block-event-location-map-css');
    if (!$is_preview) {
      wp_enqueue_style('block-event-location-map-frontend-css');
      wp_enqueue_script('block-event-location-map-frontend');
    }

    $name    = $location['name'];
    $address = isset($location['address']) ? (string) $location['address'] : '';
    $directions = 'https://www.google.com/maps/dir/?api=1&destination='
      . rawurlencode($address !== '' ? $address : $coords['lat'] . ',' . $coords['lng']);

    $wrapper = get_block_wrapper_attributes(array('class' => 'soli-event-location-map'));

    ob_start(); ?>
    <section <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes returns escaped output ?>>
      <header class="soli-event-location-map__head">
        <h3><?php echo esc_html($heading); ?></h3>
      </header>
      <?php if ($is_preview) :
        // ServerSideRender HTML cannot execute the Leaflet bundle inside the
        // editor, so preview with OpenStreetMap's plain embed iframe instead.
        $bbox  = sprintf('%F,%F,%F,%F', $coords['lng'] - 0.008, $coords['lat'] - 0.005, $coords['lng'] + 0.008, $coords['lat'] + 0.005);
        $embed = 'https://www.openstreetmap.org/export/embed.html?bbox=' . rawurlencode($bbox)
          . '&layer=mapnik&marker=' . rawurlencode($coords['lat'] . ',' . $coords['lng']);
      ?>
        <iframe class="soli-event-location-map__map" src="<?php echo esc_url($embed); ?>"
                title="<?php echo esc_attr($name); ?>" loading="lazy"></iframe>
      <?php else : ?>
        <div class="soli-event-location-map__map"
             data-soli-map
             data-lat="<?php echo esc_attr($coords['lat']); ?>"
             data-lng="<?php echo esc_attr($coords['lng']); ?>"
             data-zoom="<?php echo esc_attr($zoom); ?>"
             data-name="<?php echo esc_attr($name); ?>"
             data-address="<?php echo esc_attr($address); ?>"></div>
      <?php endif; ?>
      <div class="soli-event-location-map__body">
        <p class="soli-event-location-map__venue">
          <strong><?php echo esc_html($name); ?></strong>
          <?php if ($address !== '') : ?><br /><span><?php echo esc_html($address); ?></span><?php endif; ?>
        </p>
        <a class="soli-event-location-map__directions" href="<?php echo esc_url($directions); ?>"
           target="_blank" rel="noopener noreferrer"><?php esc_html_e('Get directions', 'soli-event'); ?> →</a>
      </div>
    </section>
    <?php return ob_get_clean();
  }

}

$soli_block_event_location_map = new SoliBlockEventLocationMap();
