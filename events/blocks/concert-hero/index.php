<?php

/*
  Description: Hero block showing the next upcoming concert (event date flagged is_concert)
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockConcertHero {
  function __construct() {
    add_action('init', array($this, 'registerBlock'));
  }

  function registerBlock() {
    $asset = include plugin_dir_path(__FILE__) . 'build/index.asset.php';

    wp_register_style('block-concert-hero-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-concert-hero-js', plugin_dir_url(__FILE__) . 'build/index.js', $asset['dependencies'], $asset['version'], true);

    register_block_type('soli/concert-hero', array(
      'editor_script'   => 'block-concert-hero-js',
      'editor_style'    => 'block-concert-hero-css',
      'render_callback' => array($this, 'theHTML'),
      'supports'        => array(
        'align' => array('full', 'wide'),
        'html'  => false,
      ),
      'attributes'      => array(
        'eyebrow'        => array('type' => 'string', 'default' => __('Next concert', 'soli-event')),
        'primaryLabel'   => array('type' => 'string', 'default' => __('Tickets & agenda →', 'soli-event')),
        'agendaUrl'      => array('type' => 'string', 'default' => '/agenda/'),
        'secondaryLabel' => array('type' => 'string', 'default' => __('Become a member of Soli', 'soli-event')),
        'secondaryUrl'   => array('type' => 'string', 'default' => '/vereniging/#lid-worden'),
        'fallbackImageId'  => array('type' => 'number'),
        'fallbackImageUrl' => array('type' => 'string', 'default' => ''),
      ),
    ));

    wp_set_script_translations('block-concert-hero-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  function theHTML($attributes) {
    wp_enqueue_style('block-concert-hero-css');

    $eyebrow        = isset($attributes['eyebrow']) ? $attributes['eyebrow'] : __('Next concert', 'soli-event');
    $primary_label  = isset($attributes['primaryLabel']) ? $attributes['primaryLabel'] : __('Tickets & agenda →', 'soli-event');
    $agenda_url     = isset($attributes['agendaUrl']) ? $attributes['agendaUrl'] : '/agenda/';
    $secondary_label = isset($attributes['secondaryLabel']) ? $attributes['secondaryLabel'] : __('Become a member of Soli', 'soli-event');
    $secondary_url  = isset($attributes['secondaryUrl']) ? $attributes['secondaryUrl'] : '/vereniging/#lid-worden';

    $handler = new \Soli\Events\EventsDatesTableHandler();
    $concert = $handler->getNextConcert();

    if (empty($concert)) {
      // Only surface the empty state to editors; the front end stays clean.
      if (current_user_can('edit_posts')) {
        return sprintf(
          '<div class="soli-concert-hero soli-concert-hero--empty"><p>%s</p></div>',
          esc_html__('No upcoming concert found. Flag an event date as a concert to populate this hero.', 'soli-event')
        );
      }
      return '';
    }

    $start_ts   = strtotime($concert['start_date']);
    $full_date  = ucfirst(date_i18n('l j F Y', $start_ts));
    $day        = ucfirst(date_i18n('l', $start_ts));
    $start_time = date_i18n('H:i', $start_ts);

    $title    = \Soli\Events\EventVisibility::maskTitle($concert['status'] ?? null, $concert['post_title']);
    // Link the card to the event page, but never for a masked PRIVATE title:
    // the permalink slug would leak the event name, and anonymous visitors get
    // a 403 on events without a PUBLIC date.
    $event_url = '';
    if (!empty($concert['post_id']) && $title === $concert['post_title']) {
      $event_url = get_permalink((int) $concert['post_id']);
    }
    // Two-tone display: leading words in paper, the last word italic + gold.
    $title_words = preg_split('/\s+/', trim($title), -1, PREG_SPLIT_NO_EMPTY);
    $title_last  = $title_words ? array_pop($title_words) : '';
    $title_lead  = implode(' ', $title_words);
    $excerpt  = $concert['post_excerpt'];
    $image    = isset($concert['featured_image']) ? $concert['featured_image'] : '';

    // Fall back to the configured image when the concert has no featured image.
    // Prefer resolving the attachment id (authoritative) over the stored url.
    if (!$image) {
      $fallback_id = isset($attributes['fallbackImageId']) ? absint($attributes['fallbackImageId']) : 0;
      if ($fallback_id) {
        $fallback = wp_get_attachment_image_src($fallback_id, 'full');
        if ($fallback) {
          $image = $fallback[0];
        }
      }
      if (!$image && !empty($attributes['fallbackImageUrl'])) {
        $image = $attributes['fallbackImageUrl'];
      }
    }

    $loc_name = isset($concert['location_name']) ? $concert['location_name'] : '';
    $loc_addr = isset($concert['location_address']) ? $concert['location_address'] : '';

    $wrapper = get_block_wrapper_attributes(array('class' => 'soli-concert-hero'));

    ob_start(); ?>
    <section <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes returns escaped output ?>>
      <div class="soli-concert-hero__bg">
        <?php if ($image) : ?>
          <img class="soli-concert-hero__bg-img" src="<?php echo esc_url($image); ?>" alt="" decoding="async" />
        <?php endif; ?>
        <div class="soli-concert-hero__overlay" aria-hidden="true"></div>
      </div>

      <div class="soli-concert-hero__inner">
        <?php if ($eyebrow) : ?>
          <p class="soli-concert-hero__eyebrow"><?php echo esc_html($eyebrow); ?></p>
        <?php endif; ?>

        <div class="soli-concert-hero__body">
        <div class="soli-concert-hero__content">
          <h1 class="soli-concert-hero__title"><?php
            if ($title_lead !== '') {
              echo '<span class="soli-concert-hero__title-lead">' . esc_html($title_lead) . '</span> ';
            }
            ?><span class="soli-concert-hero__title-accent"><?php echo esc_html($title_last); ?></span></h1>
          <?php if ($excerpt) : ?>
            <p class="soli-concert-hero__lead"><?php echo esc_html($excerpt); ?></p>
          <?php endif; ?>
          <div class="soli-concert-hero__actions">
            <a class="soli-concert-hero__btn soli-concert-hero__btn--primary" href="<?php echo esc_url($agenda_url); ?>"><?php echo esc_html($primary_label); ?></a>
            <a class="soli-concert-hero__btn soli-concert-hero__btn--outline" href="<?php echo esc_url($secondary_url); ?>"><?php echo esc_html($secondary_label); ?></a>
          </div>
        </div>

        <aside class="soli-concert-hero__aside">
          <div class="soli-concert-hero__card">
            <p class="soli-concert-hero__card-kicker"><?php esc_html_e('Concert programme', 'soli-event'); ?></p>
            <p class="soli-concert-hero__card-date"><?php echo esc_html($full_date); ?></p>
            <hr class="soli-concert-hero__card-rule" />
            <dl class="soli-concert-hero__card-list">
              <dt><?php esc_html_e('Day', 'soli-event'); ?></dt>
              <dd><?php echo esc_html($day); ?></dd>
              <dt><?php esc_html_e('Start', 'soli-event'); ?></dt>
              <dd><?php echo esc_html($start_time); ?> <?php esc_html_e('hrs', 'soli-event'); ?></dd>
              <?php if ($loc_name) : ?>
                <dt><?php esc_html_e('Location', 'soli-event'); ?></dt>
                <dd>
                  <?php echo esc_html($loc_name); ?>
                  <?php if ($loc_addr) : ?><br /><span class="soli-concert-hero__card-muted"><?php echo esc_html($loc_addr); ?></span><?php endif; ?>
                </dd>
              <?php endif; ?>
            </dl>
            <?php if ($event_url) : ?>
              <a class="soli-concert-hero__card-link" href="<?php echo esc_url($event_url); ?>"><?php esc_html_e('About this concert →', 'soli-event'); ?></a>
            <?php else : ?>
              <a class="soli-concert-hero__card-link" href="<?php echo esc_url($agenda_url); ?>"><?php esc_html_e('Full agenda →', 'soli-event'); ?></a>
            <?php endif; ?>
          </div>
        </aside>
        </div>
      </div>
    </section>
    <?php return ob_get_clean();
  }

}

$soli_block_concert_hero = new SoliBlockConcertHero();
