<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit;

/**
 * Custom capability gating the event `admin_notes` field (read + write).
 * See EventVisibility / the plugin CLAUDE.md for the full permission policy.
 */
const SOLI_EVENT_ADMIN_NOTES_CAP = 'soli_event_admin_notes';

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
