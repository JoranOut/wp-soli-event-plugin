<?php

/*
  Description: Upcoming dates list ("Komende data") for the current event; links the next dates of the event
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockEventDates {
  function __construct() {
    add_action('init', array($this, 'registerBlock'));
  }

  function registerBlock() {
    $asset = include plugin_dir_path(__FILE__) . 'build/index.asset.php';

    wp_register_style('block-event-dates-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-event-dates-js', plugin_dir_url(__FILE__) . 'build/index.js', $asset['dependencies'], $asset['version'], true);

    register_block_type('soli/event-dates', array(
      'editor_script'   => 'block-event-dates-js',
      'editor_style'    => 'block-event-dates-css',
      'render_callback' => array($this, 'theHTML'),
      'supports'        => array(
        'html' => false,
      ),
      'attributes'      => array(
        'heading' => array('type' => 'string', 'default' => __('This event is recurring', 'soli-event')),
        'count'   => array('type' => 'number', 'default' => 5),
        'note'    => array('type' => 'string', 'default' => ''),
        'postId'  => array('type' => 'number'),
      ),
    ));

    wp_set_script_translations('block-event-dates-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  function theHTML($attributes) {
    wp_enqueue_style('block-event-dates-css');

    $heading = isset($attributes['heading']) ? $attributes['heading'] : __('This event is recurring', 'soli-event');
    $count   = isset($attributes['count']) ? max(1, absint($attributes['count'])) : 5;
    $note    = isset($attributes['note']) ? $attributes['note'] : '';

    $post_id = !empty($attributes['postId']) ? absint($attributes['postId']) : 0;
    if (!$post_id) {
      $post_id = get_the_ID();
    }
    if (!$post_id) {
      $post_id = get_queried_object_id();
    }

    $handler = new \Soli\Events\EventsDatesTableHandler();
    $dates = $post_id ? $handler->getUpcomingDatesForEvent($post_id, $count) : array();

    // This block is only meaningful for events with more than one upcoming
    // date; a single-date event is covered by soli/event-date on its own.
    if (empty($dates) || count($dates) < 2) {
      if (current_user_can('edit_posts')) {
        return sprintf(
          '<div class="soli-event-dates soli-event-dates--empty"><p>%s</p></div>',
          esc_html__('This event has fewer than two upcoming dates, so the list stays hidden on the front end.', 'soli-event')
        );
      }
      return '';
    }

    $permalink = get_permalink($post_id);
    $wrapper   = get_block_wrapper_attributes(array('class' => 'soli-event-dates'));

    ob_start(); ?>
    <article <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes returns escaped output ?>>
      <header class="soli-event-dates__head">
        <h3><?php echo esc_html($heading); ?></h3>
      </header>
      <div class="soli-event-dates__body">
        <ul class="soli-event-dates__list">
          <?php foreach ($dates as $index => $date) :
            $start_ts   = strtotime($date['start_date']);
            $day_label  = date_i18n('D j M', $start_ts);
            $start_time = date_i18n('H:i', $start_ts);
            $href       = $permalink ? add_query_arg('event', absint($date['id']), $permalink) : '';
          ?>
            <li class="<?php echo $index === 0 ? 'is-next' : ''; ?>">
              <?php if ($href) : ?><a href="<?php echo esc_url($href); ?>"><?php endif; ?>
                <span class="soli-event-dates__d">
                  <?php echo esc_html($day_label); ?>
                  <?php if ($index === 0) : ?><em><?php esc_html_e('next up', 'soli-event'); ?></em><?php endif; ?>
                </span>
                <span class="soli-event-dates__t"><?php echo esc_html($start_time); ?></span>
              <?php if ($href) : ?></a><?php endif; ?>
            </li>
          <?php endforeach; ?>
        </ul>
        <?php if ($note) : ?>
          <p class="soli-event-dates__note"><?php echo esc_html($note); ?></p>
        <?php endif; ?>
      </div>
    </article>
    <?php return ob_get_clean();
  }

}

$soli_block_event_dates = new SoliBlockEventDates();
