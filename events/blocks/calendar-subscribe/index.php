<?php

/*
  Description: Calendar-subscribe promo block. Lets a visitor pick all
  concerts and/or orchestras/groups (categories, via a searchable multi-select
  dropdown) and build a live iCal subscribe URL for /ical (copy /
  add-to-calendar / download). The editor sets the default selection that is
  pre-ticked on load.
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockCalendarSubscribe {
  function __construct() {
    add_action('init', array($this, 'registerBlock'));
  }

  function registerBlock() {
    $asset = include plugin_dir_path(__FILE__) . 'build/index.asset.php';

    wp_register_style('block-calendar-subscribe-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-calendar-subscribe-js', plugin_dir_url(__FILE__) . 'build/index.js', $asset['dependencies'], $asset['version'], true);
    wp_register_script('block-calendar-subscribe-frontend', plugin_dir_url(__FILE__) . 'build/frontend.js', array(), SOLI_EVENT__PLUGIN_VERSION, true);

    register_block_type('soli/calendar-subscribe', array(
      'editor_script'   => 'block-calendar-subscribe-js',
      'editor_style'    => 'block-calendar-subscribe-css',
      'render_callback' => array($this, 'theHTML'),
      'supports'        => array(
        'align' => array('wide'),
        'html'  => false,
      ),
      'attributes'      => array(
        'heading'           => array('type' => 'string', 'default' => ''),
        'description'       => array('type' => 'string', 'default' => ''),
        'defaultConcerts'   => array('type' => 'boolean', 'default' => false),
        'defaultCategories' => array('type' => 'array', 'default' => array(), 'items' => array('type' => 'string')),
      ),
    ));

    wp_set_script_translations('block-calendar-subscribe-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  /** Build the /ical query string ('' | '?categorie=a,b&concerten=1'). */
  private function query($concerts, array $slugs) {
    $params = array();
    if ($slugs) {
      $params['categorie'] = implode(',', $slugs);
    }
    if ($concerts) {
      $params['concerten'] = '1';
    }
    return $params ? '?' . http_build_query($params) : '';
  }

  function theHTML($attributes) {
    wp_enqueue_style('block-calendar-subscribe-css');
    wp_enqueue_script('block-calendar-subscribe-frontend');

    $heading     = !empty($attributes['heading']) ? $attributes['heading'] : __('Subscribe to the agenda', 'soli-event');
    $description = isset($attributes['description']) ? $attributes['description'] : '';
    $default_concerts   = !empty($attributes['defaultConcerts']);
    $default_categories = (isset($attributes['defaultCategories']) && is_array($attributes['defaultCategories']))
      ? array_map('strval', $attributes['defaultCategories'])
      : array();

    $handler    = new \Soli\Events\EventsDatesTableHandler();
    $categories = $handler->getFeedCategories();
    $categories = is_array($categories) ? $categories : array();

    $base = home_url('/ical/');

    // Progressive enhancement: render a working link for the default selection
    // server-side; the front-end script keeps it in sync as boxes are toggled.
    $selected_slugs = array();
    $selected_cats  = array();
    foreach ($categories as $cat) {
      if (in_array($cat['slug'], $default_categories, true)) {
        $selected_slugs[] = $cat['slug'];
        $selected_cats[]  = $cat;
      }
    }
    $initial_url    = $base . $this->query($default_concerts, $selected_slugs);
    $initial_webcal = preg_replace('#^https?://#i', 'webcal://', $initial_url);

    $copied_label      = __('Copied!', 'soli-event');
    $placeholder_label = __('Select concerts, orchestras or groups…', 'soli-event');
    $remove_label      = __('Remove', 'soli-event');
    $concerts_label    = __('All concerts', 'soli-event');

    $wrapper = get_block_wrapper_attributes(array('class' => 'soli-cal-subscribe'));

    ob_start(); ?>
    <div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes returns escaped output ?>
         data-base="<?php echo esc_attr($base); ?>">
      <?php if ($heading) : ?>
        <h3 class="soli-cal-subscribe__heading"><?php echo esc_html($heading); ?></h3>
      <?php endif; ?>
      <?php if ($description) : ?>
        <p class="soli-cal-subscribe__description"><?php echo esc_html($description); ?></p>
      <?php endif; ?>

      <fieldset class="soli-cal-subscribe__options">
        <legend class="soli-cal-subscribe__legend"><?php esc_html_e('What do you want in your calendar?', 'soli-event'); ?></legend>

        <div class="soli-cal-subscribe__select"
             data-placeholder="<?php echo esc_attr($placeholder_label); ?>"
             data-remove-label="<?php echo esc_attr($remove_label); ?>">
          <div class="soli-cal-subscribe__control" role="button" tabindex="0"
               aria-expanded="false" aria-haspopup="true"
               aria-label="<?php echo esc_attr($placeholder_label); ?>">
            <span class="soli-cal-subscribe__chips">
              <?php if (!$default_concerts && empty($selected_cats)) : ?>
                <span class="soli-cal-subscribe__placeholder"><?php echo esc_html($placeholder_label); ?></span>
              <?php else : ?>
                <?php if ($default_concerts) : ?>
                  <span class="soli-cal-subscribe__chip" data-kind="concerts">
                    <?php echo esc_html($concerts_label); ?>
                    <button type="button" class="soli-cal-subscribe__chip-remove"
                            aria-label="<?php echo esc_attr($remove_label . ' ' . $concerts_label); ?>">&times;</button>
                  </span>
                <?php endif; ?>
                <?php foreach ($selected_cats as $cat) : ?>
                  <span class="soli-cal-subscribe__chip" data-value="<?php echo esc_attr($cat['slug']); ?>">
                    <?php echo esc_html($cat['name']); ?>
                    <button type="button" class="soli-cal-subscribe__chip-remove"
                            aria-label="<?php echo esc_attr($remove_label . ' ' . $cat['name']); ?>">&times;</button>
                  </span>
                <?php endforeach; ?>
              <?php endif; ?>
            </span>
            <span class="soli-cal-subscribe__caret" aria-hidden="true"></span>
          </div>
          <div class="soli-cal-subscribe__panel" hidden>
            <input type="search" class="soli-cal-subscribe__search"
                   placeholder="<?php echo esc_attr__('Search…', 'soli-event'); ?>"
                   aria-label="<?php echo esc_attr($placeholder_label); ?>" />
            <div class="soli-cal-subscribe__list">
              <label class="soli-cal-subscribe__option">
                <input type="checkbox" class="soli-cal-subscribe__opt" data-kind="concerts" <?php checked($default_concerts); ?> />
                <span><?php echo esc_html($concerts_label); ?></span>
              </label>
              <?php foreach ($categories as $cat) :
                $is_checked = in_array($cat['slug'], $default_categories, true); ?>
                <label class="soli-cal-subscribe__option">
                  <input type="checkbox" class="soli-cal-subscribe__opt" data-kind="category"
                         value="<?php echo esc_attr($cat['slug']); ?>" <?php checked($is_checked); ?> />
                  <span><?php echo esc_html($cat['name']); ?></span>
                </label>
              <?php endforeach; ?>
            </div>
            <p class="soli-cal-subscribe__no-match" hidden><?php esc_html_e('No matches found.', 'soli-event'); ?></p>
          </div>
        </div>
      </fieldset>

      <div class="soli-cal-subscribe__result">
        <code class="soli-cal-subscribe__url"><?php echo esc_html($initial_url); ?></code>
        <div class="soli-cal-subscribe__actions">
          <a class="soli-cal-subscribe__btn soli-cal-subscribe__add" href="<?php echo esc_url($initial_webcal, array('webcal')); ?>">
            <?php esc_html_e('Add to calendar', 'soli-event'); ?>
          </a>
          <button type="button" class="soli-cal-subscribe__btn soli-cal-subscribe__copy"
                  data-copied-label="<?php echo esc_attr($copied_label); ?>">
            <?php esc_html_e('Copy link', 'soli-event'); ?>
          </button>
          <a class="soli-cal-subscribe__btn soli-cal-subscribe__download" href="<?php echo esc_url($initial_url); ?>" download>
            <?php esc_html_e('Download .ics', 'soli-event'); ?>
          </a>
        </div>
      </div>

      <details class="soli-cal-subscribe__help">
        <summary><?php esc_html_e('How do I use this?', 'soli-event'); ?></summary>
        <ol>
          <li><?php esc_html_e('Tick what you want in your calendar: all concerts and/or specific orchestras and groups.', 'soli-event'); ?></li>
          <li><?php esc_html_e('Click "Add to calendar" to subscribe with your calendar app, or copy the link and add it in Google Calendar or Outlook as a calendar "from URL".', 'soli-event'); ?></li>
          <li><?php esc_html_e('Your calendar then stays up to date automatically. "Download .ics" gives a one-time snapshot that does not update.', 'soli-event'); ?></li>
        </ol>
      </details>
    </div>
    <?php return ob_get_clean();
  }

}

$soli_block_calendar_subscribe = new SoliBlockCalendarSubscribe();
