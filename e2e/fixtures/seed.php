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
$cat_nc2  = $ensure_cat('viz-nc2', 'VIZ Next-Concert Two');

$catalogue['nc-early']   = $make_cat_event('nc-early', $cat_nc, 'PUBLIC', 2, false);   // earliest, not a concert
$catalogue['nc-concert'] = $make_cat_event('nc-concert', $cat_nc, 'PUBLIC', 5, true);  // later, is a concert
$catalogue['nc-private'] = $make_cat_event('nc-private', $cat_priv, 'PRIVATE', 2, true); // private concert
$catalogue['nc2-public'] = $make_cat_event('nc2-public', $cat_nc2, 'PUBLIC', 3, true);  // public concert in a 2nd category (OR filter)
$catalogue['_categories'] = array('viz-nc' => $cat_nc, 'viz-nc-priv' => $cat_priv, 'viz-nc2' => $cat_nc2);

/* ---- 3c. my-groups fixtures ------------------------------------------ */
// Two categories mapped to administration onderdeel-ids (term meta). Group A
// has a PLANNED date BEFORE its PUBLIC one, so the panel showing the +3d date
// proves workflow states are skipped; group B only has a PLANNED date, so it
// renders the "no upcoming events" label. viz_subscriber (section 4) carries
// the matching soli_oidc_assignments meta.
$cat_mg_a = $ensure_cat('viz-mg-a', 'VIZ Mijn Groep A');
$cat_mg_b = $ensure_cat('viz-mg-b', 'VIZ Mijn Groep B');
update_term_meta($cat_mg_a, 'soli_event_onderdeel_id', 9001);
update_term_meta($cat_mg_b, 'soli_event_onderdeel_id', 9002);

$catalogue['mg-a-planned'] = $make_cat_event('mg-a-planned', $cat_mg_a, 'PLANNED', 1, false);
$catalogue['mg-a-public']  = $make_cat_event('mg-a-public', $cat_mg_a, 'PUBLIC', 3, false);
$catalogue['mg-b-planned'] = $make_cat_event('mg-b-planned', $cat_mg_b, 'PLANNED', 2, false);

/* ---- 3d. Location-map fixtures --------------------------------------- */
// Two seeded venues with pre-cached coordinates (geocoded_address matches the
// address, so rendering never calls the remote geocoder in tests) and one
// event with two future dates at different venues: the map defaults to the
// next date's venue and follows ?event=<date id> to the later one.
$loc_table = $wpdb->prefix . 'event_location';
// The coordinate columns ship with this branch; migrations only run on a
// version bump, so make sure the schema is current before seeding into it.
( new \Soli\Events\LocationTableHandler() )->createLocationTable();
$wpdb->query( "DELETE FROM $loc_table WHERE name LIKE 'VIZ %'" );

$make_location = function ( $name, $address, $lat, $lng ) use ( $wpdb, $loc_table ) {
	$wpdb->insert(
		$loc_table,
		array(
			'name'             => $name,
			'address'          => $address,
			'latitude'         => $lat,
			'longitude'        => $lng,
			'geocoded_address' => $address,
		)
	);
	return (int) $wpdb->insert_id;
};
$loc_hall   = $make_location( 'VIZ Concertzaal', 'Frans Netscherlaan 12, 1985 RB Driehuis', 52.4568000, 4.6404000 );
$loc_church = $make_location( 'VIZ Dorpskerk', 'Driehuizerkerkweg 113, 1985 EL Driehuis', 52.4530000, 4.6360000 );

$map_post_id = wp_insert_post(
	array(
		'post_type'    => 'soli_event',
		'post_title'   => $prefix . 'map-located',
		'post_status'  => 'publish',
		'post_content' => 'Seeded visibility fixture: map-located',
		'post_name'    => 'viz-map-located',
	),
	true
);
if ( ! is_wp_error( $map_post_id ) ) {
	// Distinct start offsets keep the "next upcoming" ordering deterministic.
	foreach ( array(
		array( 10, $loc_hall ),
		array( 12, $loc_church ),
	) as $d ) {
		list( $days, $loc_id ) = $d;
		$wpdb->insert(
			$dates_table,
			array(
				'post_id'    => $map_post_id,
				'start_date' => $nc_start( $days ),
				'end_date'   => $nc_end( $days ),
				'location'   => $loc_id,
				'status'     => 'PUBLIC',
				'is_concert' => 0,
				'notes'      => '',
			)
		);
	}
	$catalogue['map-located'] = array(
		'id'    => (int) $map_post_id,
		'title' => $prefix . 'map-located',
		'slug'  => 'viz-map-located',
	);
}

// Internal date (rooms, no external location): the block falls back to its
// home venue (default "Muziekcentrum, Kerkpad 83, Santpoort-Noord"). Pre-cache
// that address's geocode in the option the geocoder uses for row-less venues,
// so rendering never calls Nominatim in tests.
update_option( 'soli_event_geocode_' . md5( 'Kerkpad 83, Santpoort-Noord' ), array( 'lat' => 52.44, 'lng' => 4.63 ), false );

$internal_post_id = wp_insert_post(
	array(
		'post_type'    => 'soli_event',
		'post_title'   => $prefix . 'map-internal',
		'post_status'  => 'publish',
		'post_content' => 'Seeded visibility fixture: map-internal',
		'post_name'    => 'viz-map-internal',
	),
	true
);
if ( ! is_wp_error( $internal_post_id ) ) {
	$wpdb->insert(
		$dates_table,
		array(
			'post_id'    => $internal_post_id,
			'start_date' => $nc_start( 11 ),
			'end_date'   => $nc_end( 11 ),
			'rooms'      => '["grote-zaal"]',
			'status'     => 'PUBLIC',
			'is_concert' => 0,
			'notes'      => '',
		)
	);
	$catalogue['map-internal'] = array(
		'id'    => (int) $internal_post_id,
		'title' => $prefix . 'map-internal',
		'slug'  => 'viz-map-internal',
	);
}

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

// viz_subscriber is a member of groups 9001/9002, exactly as the passport
// plugin would sync it at SSO login (my-groups block reads this meta).
$mg_user = get_user_by( 'login', 'viz_subscriber' );
if ( $mg_user ) {
	update_user_meta(
		$mg_user->ID,
		'soli_oidc_assignments',
		array(
			array( 'onderdeel_id' => 9001, 'instrument_soort_id' => 1, 'instrument_soort' => 'Bugel', 'instrument_familie' => 'Koper' ),
			array( 'onderdeel_id' => 9002, 'instrument_soort_id' => 2, 'instrument_soort' => 'Kleine trom', 'instrument_familie' => 'Slagwerk' ),
		)
	);
}

echo "\n" . wp_json_encode( $catalogue ) . "\n";
