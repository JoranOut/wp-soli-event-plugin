<?php
add_action( 'init', function () {
    $roles = [ 'administrator' ];

    foreach ( $roles as $role_name ) {
        if ( $role = get_role( $role_name ) ) {
            $role->add_cap( 'soli_event_admin_notes', true );
        }
    }
} );
