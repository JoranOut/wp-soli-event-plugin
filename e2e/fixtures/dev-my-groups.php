<?php
/**
 * Local dev seeder for the my-groups block ("Mijn orkesten"). Run against the
 * DEV site (localhost:8888):
 *
 *   wp-env run cli wp eval-file wp-content/plugins/wp-soli-event-plugin/e2e/fixtures/dev-my-groups.php
 *
 * Fakes what an SSO login would produce: gives the `admin` user two group
 * assignments (Harmonie = onderdeel 101, Funband = onderdeel 102), maps those
 * onderdeel-ids to the harmonie/funband categories via term meta, and seeds
 * one upcoming PUBLIC rehearsal per group. Idempotent: re-running updates in
 * place. Not used by the test suite.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

global $wpdb;
$dates_table = $wpdb->prefix . 'event_dates';

$ensure_cat = function ( $slug, $name, $onderdeel_id ) {
	$term    = get_term_by( 'slug', $slug, 'category' );
	$term_id = $term ? (int) $term->term_id : 0;
	if ( ! $term_id ) {
		$res     = wp_insert_term( $name, 'category', array( 'slug' => $slug ) );
		$term_id = is_wp_error( $res ) ? 0 : (int) $res['term_id'];
	}
	if ( $term_id ) {
		update_term_meta( $term_id, 'soli_event_onderdeel_id', $onderdeel_id );
	}
	return $term_id;
};

$ensure_event = function ( $slug, $title, $cat_id, $start ) use ( $wpdb, $dates_table ) {
	// Same content a real event gets from the soli_event block template, so
	// these open in the editor exactly like UI-created events (the create-event
	// block then manages the wp_event_dates rows seeded below).
	$content = '<!-- wp:soli/create-event {"align":"wide","lock":{"move":true,"remove":true}} /-->';

	$existing = get_page_by_path( $slug, OBJECT, 'soli_event' );
	$post_id  = $existing ? (int) $existing->ID : 0;
	if ( $post_id ) {
		wp_update_post(
			array(
				'ID'           => $post_id,
				'post_content' => $content,
			)
		);
	} else {
		$post_id = (int) wp_insert_post(
			array(
				'post_type'    => 'soli_event',
				'post_title'   => $title,
				'post_status'  => 'publish',
				'post_name'    => $slug,
				'post_content' => $content,
			)
		);
	}
	if ( ! $post_id ) {
		return;
	}
	wp_set_object_terms( $post_id, array( $cat_id ), 'category' );
	$wpdb->delete( $dates_table, array( 'post_id' => $post_id ) );
	$wpdb->insert(
		$dates_table,
		array(
			'post_id'    => $post_id,
			'start_date' => gmdate( 'Y-m-d H:i:s', $start ),
			'end_date'   => gmdate( 'Y-m-d H:i:s', $start + 2 * HOUR_IN_SECONDS ),
			'status'     => 'PUBLIC',
			'is_concert' => 0,
			'notes'      => '',
		)
	);
	echo "event {$title}: " . gmdate( 'Y-m-d H:i', $start ) . "\n";
};

$cat_harmonie = $ensure_cat( 'harmonie', 'Harmonie', 101 );
$cat_funband  = $ensure_cat( 'funband', 'Funband', 102 );
echo "categories: harmonie={$cat_harmonie} (onderdeel 101), funband={$cat_funband} (onderdeel 102)\n";

// Next Monday 20:00 for Harmonie, next Friday 19:30 for Funband (site time).
$now = current_time( 'timestamp' );
$ensure_event( 'dev-repetitie-harmonie', 'Repetitie Harmonie', $cat_harmonie, strtotime( 'next monday 20:00', $now ) );
$ensure_event( 'dev-repetitie-funband', 'Repetitie Funband', $cat_funband, strtotime( 'next friday 19:30', $now ) );

// The meta the passport plugin would write at SSO login.
$user = get_user_by( 'login', 'admin' );
if ( $user ) {
	update_user_meta(
		$user->ID,
		'soli_passport_assignments',
		array(
			array( 'onderdeel_id' => 101, 'instrument_soort_id' => 1, 'instrument_soort' => 'Bugel', 'instrument_familie' => 'Koper' ),
			array( 'onderdeel_id' => 102, 'instrument_soort_id' => 2, 'instrument_soort' => 'Gitaar', 'instrument_familie' => 'Overig' ),
		)
	);
	echo "assignments set for user 'admin' (onderdeel 101 + 102)\n";
} else {
	echo "user 'admin' not found - no assignments written\n";
}
