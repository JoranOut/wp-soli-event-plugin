<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit; // Exit if accessed directly

// Register a front-end block template for single event pages. This ships the
// template from the plugin (rather than the theme) so the event detail layout
// travels with the events feature. Requires a block theme + WordPress 6.7+;
// classic themes fall back to their own single template.
function soli_events_register_single_template() {
  if (!function_exists('register_block_template')) {
    return;
  }

  register_block_template('soli-event//single-soli_event', array(
    'title'       => __('Single Event', 'soli-event'),
    'description' => __('Event detail page: title, content, and the upcoming dates, location map and next concert cards.', 'soli-event'),
    'content'     => soli_events_single_template_content(),
  ));
}
add_action('init', 'Soli\Events\soli_events_register_single_template');

// Block the single page of a "private" event (one with no PUBLIC date) for
// not-logged-in visitors with a 403 (S6). Logged-in users may view it.
function soli_events_guard_private_single() {
  if (is_admin() || !is_singular('soli_event') || is_user_logged_in()) {
    return;
  }

  global $wpdb;
  $post_id = get_queried_object_id();
  if (!$post_id) {
    return;
  }

  $dates_table = $wpdb->prefix . 'event_dates';
  $public_dates = (int) $wpdb->get_var($wpdb->prepare(
    "SELECT COUNT(*) FROM $dates_table WHERE post_id = %d AND status = %s",
    $post_id,
    EventVisibility::STATUS_PUBLIC
  ));

  if ($public_dates === 0) {
    wp_die(
      esc_html__('This event is private.', 'soli-event'),
      esc_html__('Forbidden', 'soli-event'),
      array('response' => 403)
    );
  }
}
add_action('template_redirect', 'Soli\Events\soli_events_guard_private_single');

// Block markup for the single event template. Kept intentionally small: a
// header, then a two-column body with the post content beside an aside that
// stacks the three event blocks.
function soli_events_single_template_content() {
  return <<<'HTML'
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
	<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|30"}}},"layout":{"type":"constrained"}} -->
	<div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--30)">
		<!-- wp:post-title {"level":1} /-->
	</div>
	<!-- /wp:group -->

	<!-- wp:columns {"align":"wide","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|50"}}}} -->
	<div class="wp-block-columns alignwide">
		<!-- wp:column {"width":"66.66%"} -->
		<div class="wp-block-column" style="flex-basis:66.66%">
			<!-- wp:post-featured-image {"style":{"border":{"radius":"12px"}}} /-->
			<!-- wp:post-content {"layout":{"type":"constrained"}} /-->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"width":"33.34%","style":{"spacing":{"blockGap":"var:preset|spacing|40"}}} -->
		<div class="wp-block-column" style="flex-basis:33.34%">
			<!-- wp:soli/event-dates /-->
			<!-- wp:soli/event-location-map /-->
			<!-- wp:soli/next-concert /-->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
HTML;
}
