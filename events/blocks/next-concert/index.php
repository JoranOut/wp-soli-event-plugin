<?php

/*
  Description: Compact "Concertagenda" card that always links the next upcoming concert (event date flagged is_concert)
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockNextConcert {
  function __construct() {
    add_action('init', array($this, 'registerBlock'));
  }

  function registerBlock() {
    $asset = include plugin_dir_path(__FILE__) . 'build/index.asset.php';

    wp_register_style('block-next-concert-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-next-concert-js', plugin_dir_url(__FILE__) . 'build/index.js', $asset['dependencies'], $asset['version'], true);

    register_block_type('soli/next-concert', array(
      'editor_script'   => 'block-next-concert-js',
      'editor_style'    => 'block-next-concert-css',
      'render_callback' => array($this, 'theHTML'),
      'supports'        => array(
        'html' => false,
      ),
      'attributes'      => array(
        'eyebrow'     => array('type' => 'string', 'default' => __('Concert agenda', 'soli-event')),
        'lead'        => array('type' => 'string', 'default' => __('The next concert on Soli’s programme.', 'soli-event')),
        'buttonLabel' => array('type' => 'string', 'default' => __('Agenda →', 'soli-event')),
        'agendaUrl'   => array('type' => 'string', 'default' => '/agenda/'),
      ),
    ));

    wp_set_script_translations('block-next-concert-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  function theHTML($attributes) {
    wp_enqueue_style('block-next-concert-css');

    $eyebrow      = isset($attributes['eyebrow']) ? $attributes['eyebrow'] : __('Concert agenda', 'soli-event');
    $lead         = isset($attributes['lead']) ? $attributes['lead'] : __('The next concert on Soli’s programme.', 'soli-event');
    $button_label = isset($attributes['buttonLabel']) ? $attributes['buttonLabel'] : __('Agenda →', 'soli-event');
    $agenda_url   = isset($attributes['agendaUrl']) ? $attributes['agendaUrl'] : '/agenda/';

    $handler = new \Soli\Events\EventsDatesTableHandler();
    $concert = $handler->getNextConcert();

    if (empty($concert)) {
      // Only surface the empty state to editors; the front end stays clean.
      if (current_user_can('edit_posts')) {
        return sprintf(
          '<div class="soli-next-concert soli-next-concert--empty"><p>%s</p></div>',
          esc_html__('No upcoming concert found. Flag an event date as a concert to populate this card.', 'soli-event')
        );
      }
      return '';
    }

    $start_ts = strtotime($concert['start_date']);
    // Weekday + day + month, no year - matches the aside card in the design.
    $date_label = date_i18n('l j F', $start_ts);
    $title      = sprintf('%s - %s', $concert['post_title'], $date_label);
    $permalink  = get_permalink($concert['post_id']);

    $wrapper = get_block_wrapper_attributes(array('class' => 'soli-next-concert'));

    ob_start(); ?>
    <div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes returns escaped output ?>>
      <p class="soli-next-concert__eyebrow"><?php echo esc_html($eyebrow); ?></p>
      <?php if ($permalink) : ?>
        <a class="soli-next-concert__title" href="<?php echo esc_url($permalink); ?>"><?php echo esc_html($title); ?></a>
      <?php else : ?>
        <p class="soli-next-concert__title"><?php echo esc_html($title); ?></p>
      <?php endif; ?>
      <?php if ($lead) : ?>
        <p class="soli-next-concert__lead"><?php echo esc_html($lead); ?></p>
      <?php endif; ?>
      <?php if ($button_label) : ?>
        <div class="soli-next-concert__actions">
          <a class="soli-next-concert__btn" href="<?php echo esc_url($agenda_url); ?>"><?php echo esc_html($button_label); ?></a>
        </div>
      <?php endif; ?>
    </div>
    <?php return ob_get_clean();
  }

}

$soli_block_next_concert = new SoliBlockNextConcert();
