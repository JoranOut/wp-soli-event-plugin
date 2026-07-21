<?php
/**
 * Visibility test-catalogue seeder. Run via:
 *   wp eval-file wp-content/plugins/wp-soli-event-plugin/e2e/fixtures/seed.php
 *
 * Idempotent: wipes any prior catalogue (posts titled "VIZ:*") and their
 * event_dates rows, then recreates a fixed set of events covering every
 * (post_status x date_status x time) cell the visibility matrix cares about.
 *
 * Seeds directly into wp_posts + wp_event_dates (bypassing the block UI) so the
 * whole catalogue builds in well under a second. Titles are deterministic so
 * specs locate rows by title; concurrent UI-created events use random titles
 * and never collide with the "VIZ:" prefix.
 *
 * Also ensures role users exist: viz_subscriber / viz_editor (password "password").
 *
 * Prints a JSON map {key: {id, title, slug}} on the last line for the TS side.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

global $wpdb;
$dates_table = $wpdb->prefix . 'event_dates';
$prefix      = 'VIZ:';

/* ---- 1. Wipe prior catalogue ---------------------------------------- */
$old = $wpdb->get_col(
	$wpdb->prepare(
		"SELECT ID FROM {$wpdb->posts} WHERE post_type = 'soli_event' AND post_title LIKE %s",
		$wpdb->esc_like( $prefix ) . '%'
	)
);
foreach ( $old as $id ) {
	$wpdb->delete( $dates_table, array( 'post_id' => $id ) );
	wp_delete_post( (int) $id, true );
}

/* ---- 2. Time anchors ------------------------------------------------ */
$future_start = gmdate( 'Y-m-d H:i:s', strtotime( current_time( 'mysql' ) . ' +10 days' ) );
$future_end   = gmdate( 'Y-m-d H:i:s', strtotime( current_time( 'mysql' ) . ' +10 days +1 hour' ) );
$past_start   = gmdate( 'Y-m-d H:i:s', strtotime( current_time( 'mysql' ) . ' -10 days' ) );
$past_end     = gmdate( 'Y-m-d H:i:s', strtotime( current_time( 'mysql' ) . ' -10 days +1 hour' ) );

/**
 * @param string $key         catalogue key (title suffix)
 * @param string $post_status wp post_status
 * @param array  $dates       list of [status, when('future'|'past'), is_concert]
 */
$make = function ( $key, $post_status, array $dates ) use ( $wpdb, $dates_table, $prefix, $future_start, $future_end, $past_start, $past_end ) {
	$postarr = array(
		'post_type'    => 'soli_event',
		'post_title'   => $prefix . $key,
		'post_status'  => $post_status,
		'post_content' => 'Seeded visibility fixture: ' . $key,
		'post_name'    => 'viz-' . $key,
	);
	// A "future" (scheduled) post only keeps that status if its post_date is
	// actually in the future; otherwise wp_insert_post silently publishes it.
	if ( 'future' === $post_status ) {
		$postarr['post_date']     = $future_start;
		$postarr['post_date_gmt'] = $future_start;
	}
	$post_id = wp_insert_post( $postarr, true );
	if ( is_wp_error( $post_id ) ) {
		return null;
	}

	foreach ( $dates as $d ) {
		list( $status, $when, $is_concert ) = array_pad( $d, 3, 0 );
		$wpdb->insert(
			$dates_table,
			array(
				'post_id'    => $post_id,
				'start_date' => 'future' === $when ? $future_start : $past_start,
				'end_date'   => 'future' === $when ? $future_end : $past_end,
				'status'     => $status,
				'is_concert' => $is_concert ? 1 : 0,
				'notes'      => '',
			)
		);
	}

	return array(
		'id'    => (int) $post_id,
		'title' => $prefix . $key,
		'slug'  => 'viz-' . $key,
	);
};

/* ---- 3. Catalogue --------------------------------------------------- */
$catalogue = array();

// Post-status axis (each with a PUBLIC future date).
$catalogue['post-publish'] = $make( 'post-publish', 'publish', array( array( 'PUBLIC', 'future' ) ) );
$catalogue['post-draft']   = $make( 'post-draft', 'draft', array( array( 'PUBLIC', 'future' ) ) );
$catalogue['post-pending'] = $make( 'post-pending', 'pending', array( array( 'PUBLIC', 'future' ) ) );
$catalogue['post-private'] = $make( 'post-private', 'private', array( array( 'PUBLIC', 'future' ) ) );
$catalogue['post-future']  = $make( 'post-future', 'future', array( array( 'PUBLIC', 'future' ) ) );

// Date-status axis (publish post, future date).
$catalogue['date-public']  = $make( 'date-public', 'publish', array( array( 'PUBLIC', 'future' ) ) );
$catalogue['date-private'] = $make( 'date-private', 'publish', array( array( 'PRIVATE', 'future' ) ) );
$catalogue['date-pending'] = $make( 'date-pending', 'publish', array( array( 'PENDING_APPROVAL', 'future' ) ) );
$catalogue['date-planned'] = $make( 'date-planned', 'publish', array( array( 'PLANNED', 'future' ) ) );
$catalogue['date-option']  = $make( 'date-option', 'publish', array( array( 'OPTION', 'future' ) ) ); // F10 raw default

// Time axis (publish post, PUBLIC date).
$catalogue['time-future'] = $make( 'time-future', 'publish', array( array( 'PUBLIC', 'future' ) ) );
$catalogue['time-past']   = $make( 'time-past', 'publish', array( array( 'PUBLIC', 'past' ) ) );

// Composites / specials.
$catalogue['private-only']      = $make( 'private-only', 'publish', array( array( 'PRIVATE', 'future' ) ) );
$catalogue['public-and-private'] = $make( 'public-and-private', 'publish', array( array( 'PUBLIC', 'future' ), array( 'PRIVATE', 'future' ) ) );
$catalogue['concert']           = $make( 'concert', 'publish', array( array( 'PUBLIC', 'future', 1 ) ) );
$catalogue['recurring']         = $make( 'recurring', 'publish', array( array( 'PUBLIC', 'future' ), array( 'PUBLIC', 'future' ), array( 'PUBLIC', 'future' ) ) );
// Mixed-status recurrence to exercise the event-dates block filter (F1):
// 2 PUBLIC + 1 PRIVATE + 1 PLANNED future dates.
$catalogue['recurring-mixed']   = $make( 'recurring-mixed', 'publish', array( array( 'PUBLIC', 'future' ), array( 'PUBLIC', 'future' ), array( 'PRIVATE', 'future' ), array( 'PLANNED', 'future' ) ) );
$catalogue['no-public-date']    = $make( 'no-public-date', 'publish', array( array( 'PLANNED', 'future' ) ) );

/* ---- 3b. next-concert isolation via a dedicated category ------------ */
// A category no other test touches, so "next concert in this category" is
// deterministic. Contains an EARLY non-concert (+2d) and a LATER concert (+5d)
// so onlyConcerts on/off select different events.
$nc_start = fn($d) => gmdate('Y-m-d H:i:s', strtotime(current_time('mysql') . " +$d days"));
$nc_end   = fn($d) => gmdate('Y-m-d H:i:s', strtotime(current_time('mysql') . " +$d days +1 hour"));

$make_cat_event = function ($key, $cat_term_id, $status, $days, $is_concert) use ($wpdb, $dates_table, $prefix, $nc_start, $nc_end) {
	$post_id = wp_insert_post(array(
		'post_type'   => 'soli_event',
		'post_title'  => $prefix . $key,
		'post_status' => 'publish',
		'post_name'   => 'viz-' . $key,
	), true);
	if (is_wp_error($post_id)) return null;
	wp_set_object_terms($post_id, array((int) $cat_term_id), 'category');
	$wpdb->insert($dates_table, array(
		'post_id'    => $post_id,
		'start_date' => $nc_start($days),
		'end_date'   => $nc_end($days),
		'status'     => $status,
		'is_concert' => $is_concert ? 1 : 0,
		'notes'      => '',
	));
	return array('id' => (int) $post_id, 'title' => $prefix . $key, 'slug' => 'viz-' . $key);
};

$ensure_cat = function ($slug, $name) {
	$term = get_term_by('slug', $slug, 'category');
	if ($term) return (int) $term->term_id;
	$res = wp_insert_term($name, 'category', array('slug' => $slug));
	return is_wp_error($res) ? 0 : (int) $res['term_id'];
};

$cat_nc   = $ensure_cat('viz-nc', 'VIZ Next-Concert');
$cat_priv = $ensure_cat('viz-nc-priv', 'VIZ Next-Concert Private');

$catalogue['nc-early']   = $make_cat_event('nc-early', $cat_nc, 'PUBLIC', 2, false);   // earliest, not a concert
$catalogue['nc-concert'] = $make_cat_event('nc-concert', $cat_nc, 'PUBLIC', 5, true);  // later, is a concert
$catalogue['nc-private'] = $make_cat_event('nc-private', $cat_priv, 'PRIVATE', 2, true); // private concert
$catalogue['_categories'] = array('viz-nc' => $cat_nc, 'viz-nc-priv' => $cat_priv);

/* ---- 4. Role users -------------------------------------------------- */
foreach ( array( 'viz_subscriber' => 'subscriber', 'viz_editor' => 'editor' ) as $login => $role ) {
	if ( ! username_exists( $login ) ) {
		wp_insert_user(
			array(
				'user_login' => $login,
				'user_pass'  => 'password',
				'user_email' => $login . '@example.test',
				'role'       => $role,
			)
		);
	}
}

echo "\n" . wp_json_encode( $catalogue ) . "\n";
