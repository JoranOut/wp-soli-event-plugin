<?php
/**
 * Auto-discovered render callback for block: soli/get-event-date
 */
if ( ! function_exists( 'render_block_soli_get_event_date' ) ) {
	function render_block_soli_get_event_date( $attributes, $content, $block ) {
		$post = get_post();

		return '<div>Post ID: ' . get_the_ID() . '</div>';
	}
}
