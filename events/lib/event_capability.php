<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit;

/**
 * Custom capability gating the event `admin_notes` field (read + write).
 * See EventVisibility / the plugin CLAUDE.md for the full permission policy.
 */
const SOLI_EVENT_ADMIN_NOTES_CAP = 'soli_event_admin_notes';

/**
 * Capability for managing locations (the Locations admin screen and the REST
 * update route). A location is shared by every event date that uses it, across
 * events written by other people, so changing or deleting one edits other
 * people's events: that is edit_others_posts, which editors and administrators
 * hold and authors do not. Creating a location stays on edit_posts because it
 * is part of scheduling a date.
 */
const SOLI_EVENT_LOCATIONS_CAP = 'edit_others_posts';

// Roles that receive the capability on activation.
const SOLI_EVENT_ADMIN_NOTES_ROLES = array('administrator');

/** Grant the admin-notes capability. Called from the activation hook. */
function add_event_capabilities() {
  foreach (SOLI_EVENT_ADMIN_NOTES_ROLES as $role_name) {
    if ($role = get_role($role_name)) {
      $role->add_cap(SOLI_EVENT_ADMIN_NOTES_CAP, true);
    }
  }
}

/** Remove the admin-notes capability from every role. Called on uninstall. */
function remove_event_capabilities() {
  foreach (wp_roles()->roles as $role_name => $details) {
    if ($role = get_role($role_name)) {
      $role->remove_cap(SOLI_EVENT_ADMIN_NOTES_CAP);
    }
  }
}
