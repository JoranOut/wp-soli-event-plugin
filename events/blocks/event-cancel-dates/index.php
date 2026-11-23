<?php

/*
  Description: Page for someone without an account to cancel dates of one event. The event comes from
  the secret ?token= in the URL (see Soli\Events\CancelLink); the block itself stores nothing.
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Soli\Events\CancelLink;

class SoliBlockEventCancelDates {
  function __construct() {
    add_action('init', array($this, 'registerBlock'));
  }

  function registerBlock() {
    $asset = include plugin_dir_path(__FILE__) . 'build/index.asset.php';

    wp_register_style('block-event-cancel-dates-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-event-cancel-dates-js', plugin_dir_url(__FILE__) . 'build/index.js', $asset['dependencies'], $asset['version'], true);
    $frontend = include plugin_dir_path(__FILE__) . 'build/frontend.asset.php';
    wp_register_script('block-event-cancel-dates-frontend', plugin_dir_url(__FILE__) . 'build/frontend.js', $frontend['dependencies'], $frontend['version'], true);
    wp_register_style('block-event-cancel-dates-frontend', plugin_dir_url(__FILE__) . 'build/frontend.css', array(), $frontend['version']);

    register_block_type('soli/event-cancel-dates', array(
      'editor_script'   => 'block-event-cancel-dates-js',
      'editor_style'    => 'block-event-cancel-dates-css',
      'render_callback' => array($this, 'theHTML'),
      // Empty means the translated default, so an untouched block follows the site language.
      'attributes'      => array(
        'intro'       => array('type' => 'string', 'default' => ''),
        'noLinkText'  => array('type' => 'string', 'default' => ''),
        'invalidText' => array('type' => 'string', 'default' => ''),
      ),
      'supports'        => array(
        'html'     => false,
        'multiple' => false,
        'align'    => array('wide', 'full'),
      ),
    ));

    wp_set_script_translations('block-event-cancel-dates-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  /** Editor-set rich text (from RichText) or the translated default. */
  private function text($attributes, $key, $default) {
    $custom = isset($attributes[$key]) ? trim((string) $attributes[$key]) : '';
    return $custom !== '' ? wp_kses_post($custom) : esc_html($default);
  }

  private function message($html, $modifier = '') {
    wp_enqueue_style('block-event-cancel-dates-frontend');
    $wrapper = get_block_wrapper_attributes(array('class' => trim('soli-cancel-dates soli-cancel-dates--message ' . $modifier)));
    return sprintf('<div %s><p>%s</p></div>', $wrapper, $html);
  }

  function theHTML($attributes = array()) {
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- the token is the credential
    $token = isset($_GET[CancelLink::QUERY_ARG]) ? sanitize_text_field(wp_unslash($_GET[CancelLink::QUERY_ARG])) : '';
    if ($token === '') {
      return $this->message($this->text($attributes, 'noLinkText', __('Open this page through the cancellation link you received from Soli.', 'soli-event')));
    }

    $post = CancelLink::findEvent($token);
    if (!$post) {
      return $this->message($this->text($attributes, 'invalidText', __('This link is not valid (anymore). Ask Soli for a new link.', 'soli-event')), 'is-error');
    }

    $dates = (new \Soli\Events\EventsDatesTableHandler())->getDatesForCancelLink($post->ID);
    if (!$dates) {
      return $this->message(esc_html__('This event has no dates.', 'soli-event'));
    }

    $this_month = current_time('Y-m') . '-01';
    $initial = null;
    $payload = array();
    foreach ($dates as $row) {
      $date = CancelLink::publicDate($row);
      $start = strtotime($date['start_date']);
      $end = strtotime($date['end_date']);
      $day_label = date_i18n('D j M', $start);
      $until = date('Y-m-d', $start) === date('Y-m-d', $end) ? date_i18n('H:i', $end) : date_i18n('D j M H:i', $end);
      $payload[] = $date + array(
        'minutes'  => $this->minutes($date),
        'label'    => $day_label . ' ' . date_i18n('H:i', $start) . '–' . $until,
        'dayLabel' => $day_label,
      );
      if ($initial === null && $date['start_date'] >= $this_month) {
        $initial = substr($date['start_date'], 0, 10);
      }
    }
    // Open on the first month from now with dates, or on the last month for an event that is over.
    $initial = $initial ?? substr(end($dates)['start_date'], 0, 10);

    wp_enqueue_script('block-event-cancel-dates-frontend');
    wp_enqueue_style('block-event-cancel-dates-frontend');

    $i18n = array(
      'cancelDay'       => __('Cancel whole day', 'soli-event'),
      'undoDay'         => __('Undo day', 'soli-event'),
      /* translators: %1$s: a date and time range, e.g. "Tue 12 Aug 19:30–21:00" */
      'chipCancel'      => __('Cancel %1$s', 'soli-event'),
      /* translators: %1$s: a date and time range, e.g. "Tue 12 Aug 19:30–21:00" */
      'chipUndo'        => __('Undo cancellation of %1$s', 'soli-event'),
      'cancelledBySoli' => __('Cancelled by Soli', 'soli-event'),
      /* translators: %1$s: a day, e.g. "Tue 12 Aug" */
      'dayCancelLabel'  => __('Cancel all dates on %1$s', 'soli-event'),
      /* translators: %1$s: a day, e.g. "Tue 12 Aug" */
      'dayUndoLabel'    => __('Undo all cancellations on %1$s', 'soli-event'),
      /* translators: 1: number of dates that go ahead, 2: number of dates in the month, 3: hours, e.g. 7,5 */
      'summary'         => __('%1$s of %2$s dates go ahead · %3$s hours', 'soli-event'),
      'noDatesInMonth'  => __('No dates this month.', 'soli-event'),
      /* translators: %1$s: the date, e.g. "Tue 12 Aug 19:30–21:00" */
      'didCancel'       => __('%1$s is cancelled.', 'soli-event'),
      /* translators: %1$s: the date, e.g. "Tue 12 Aug 19:30–21:00" */
      'didRestore'      => __('%1$s goes ahead again.', 'soli-event'),
      /* translators: %1$s: a day, e.g. "Tue 12 Aug" */
      'didCancelDay'    => __('All dates on %1$s are cancelled.', 'soli-event'),
      /* translators: %1$s: a day, e.g. "Tue 12 Aug" */
      'didRestoreDay'   => __('All dates on %1$s go ahead again.', 'soli-event'),
      'goesAhead'       => __('goes ahead', 'soli-event'),
      'error'           => __('That did not work. Reload the page and try again.', 'soli-event'),
    );

    $wrapper = get_block_wrapper_attributes(array(
      'class'         => 'soli-cancel-dates',
      'data-endpoint' => rest_url('soli_event/v1/cancel'),
      'data-token'    => strtolower($token),
      'data-i18n'     => wp_json_encode($i18n),
      'data-dates'    => wp_json_encode($payload),
      'data-initial'  => $initial,
      'data-locale'   => str_replace('_', '-', determine_locale()),
      'data-week-start' => (int) get_option('start_of_week', 1),
    ));

    ob_start(); ?>
    <div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes escapes ?>>
      <h2 class="soli-cancel-dates__title"><?php echo esc_html(get_the_title($post)); ?></h2>
      <p class="soli-cancel-dates__intro"><?php echo $this->text($attributes, 'intro', __('Click a time to cancel it, or cancel a whole day. A cancelled date stays on the list and is not charged. Click it again to undo.', 'soli-event')); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- text() escapes ?></p>
      <div class="soli-cancel-dates__app"></div>
    </div>
    <?php return ob_get_clean();
  }

  // Whole minutes, like the invoice: stored dates can carry stray seconds.
  function minutes($date) {
    $start = (int) floor(strtotime($date['start_date']) / 60);
    $end = (int) floor(strtotime($date['end_date']) / 60);
    return max($end - $start, 0);
  }
}

$soli_block_event_cancel_dates = new SoliBlockEventCancelDates();
