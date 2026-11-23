<?php

namespace Soli\Events;

/**
 * Run database migrations when the stored schema version is older than the
 * plugin version. dbDelta() (used by the table handlers' create* methods) is
 * idempotent: it adds new columns/indexes and adjusts column definitions, and
 * never drops anything - so re-running it on every upgrade is safe.
 *
 * This runs on admin page loads rather than only on activation, so that
 * installations updated in place (e.g. via the GitHub updater) also receive
 * schema changes without needing to deactivate/reactivate.
 */
add_action('admin_init', 'Soli\Events\soli_event_check_db_version');

// Bump when a table definition changes between releases, so nightly and dev installs (whose plugin
// version does not move) still pick the change up.
const SOLI_EVENT_SCHEMA_REVISION = 2;

function soli_event_check_db_version() {
    $installed_version = get_option('soli_event_db_version', '0');
    $current_version = SOLI_EVENT__PLUGIN_VERSION;
    $installed_revision = (int) get_option('soli_event_schema_revision', 0);

    if (version_compare($installed_version, $current_version, '<') || $installed_revision < SOLI_EVENT_SCHEMA_REVISION) {
        soli_event_run_migrations($installed_version);
        update_option('soli_event_db_version', $current_version);
        update_option('soli_event_schema_revision', SOLI_EVENT_SCHEMA_REVISION);
    }
}

function soli_event_run_migrations($installed_version) {
    // Re-apply the current table definitions. dbDelta reconciles the live
    // schema with these without touching data.
    (new EventsDatesTableHandler())->createEventTable();
    (new LocationTableHandler())->createLocationTable();
    (new EventsLogTableHandler())->createEventLogTable();
}
