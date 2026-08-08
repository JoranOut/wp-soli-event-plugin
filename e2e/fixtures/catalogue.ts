/**
 * The seeded visibility catalogue (mirrors e2e/fixtures/seed.php) plus the
 * intended visibility matrix each surface is asserted against.
 *
 * Specs locate seeded events by title: `title('date-private')` -> "VIZ:date-private".
 * Keep this file and seed.php in lock-step.
 */
import * as path from 'path';

export const SEED_PREFIX = 'VIZ:';

export type CatalogueKey =
    | 'post-publish' | 'post-draft' | 'post-pending' | 'post-private' | 'post-future'
    | 'date-public' | 'date-private' | 'date-pending' | 'date-planned' | 'date-option'
    | 'time-future' | 'time-past'
    | 'private-only' | 'public-and-private' | 'concert' | 'recurring' | 'recurring-mixed' | 'no-public-date';

export const title = (key: CatalogueKey) => `${SEED_PREFIX}${key}`;
export const slug = (key: CatalogueKey) => `viz-${key}`;

export type Role = 'anonymous' | 'subscriber' | 'editor' | 'admin';

// storageState file per role. `anonymous` -> undefined (fresh context, no auth).
const AUTH_DIR = path.join(__dirname, '..', '.auth');
export const ROLE_USERS: Record<Exclude<Role, 'anonymous' | 'admin'>, { username: string; password: string }> = {
    subscriber: { username: 'viz_subscriber', password: 'password' },
    editor: { username: 'viz_editor', password: 'password' },
};
export function storageStateFor(role: Role): string | undefined {
    if (role === 'anonymous') return undefined;
    if (role === 'admin') return process.env.STORAGE_STATE_PATH;
    return path.join(AUTH_DIR, `${role}.json`);
}

/**
 * INTENDED visibility matrix (confirmed policy 2026-07-20). Values:
 *   'full'   — event/date shown with real title
 *   'masked' — date shown but title masked to "private"
 *   'hidden' — not shown / not returned
 *
 * These are the ASSERTIONS. Where current code disagrees the spec goes red,
 * which is exactly the Phase 1/2 work list.
 */
export type Vis = 'full' | 'masked' | 'hidden';

// Public list (S1 / REST future R3): publish + PUBLIC/PRIVATE + future.
// PRIVATE masked for not-logged-in, full for logged-in.
export const listMatrix: Record<CatalogueKey, Record<Role, Vis>> = {
    'post-publish':       { anonymous: 'full',   subscriber: 'full',   editor: 'full',   admin: 'full' },
    'post-draft':         { anonymous: 'hidden', subscriber: 'hidden', editor: 'hidden', admin: 'hidden' },
    'post-pending':       { anonymous: 'hidden', subscriber: 'hidden', editor: 'hidden', admin: 'hidden' },
    'post-private':       { anonymous: 'hidden', subscriber: 'hidden', editor: 'hidden', admin: 'hidden' },
    'post-future':        { anonymous: 'hidden', subscriber: 'hidden', editor: 'hidden', admin: 'hidden' },
    'date-public':        { anonymous: 'full',   subscriber: 'full',   editor: 'full',   admin: 'full' },
    'date-private':       { anonymous: 'masked', subscriber: 'full',   editor: 'full',   admin: 'full' },
    // Workflow states never appear on a public feed, for ANY viewer (editors
    // manage them in wp-admin / the create-event block, and via REST /events/{id}).
    'date-pending':       { anonymous: 'hidden', subscriber: 'hidden', editor: 'hidden', admin: 'hidden' },
    'date-planned':       { anonymous: 'hidden', subscriber: 'hidden', editor: 'hidden', admin: 'hidden' },
    'date-option':        { anonymous: 'hidden', subscriber: 'hidden', editor: 'hidden', admin: 'hidden' },
    'time-future':        { anonymous: 'full',   subscriber: 'full',   editor: 'full',   admin: 'full' },
    'time-past':          { anonymous: 'hidden', subscriber: 'hidden', editor: 'hidden', admin: 'hidden' },
    'private-only':       { anonymous: 'masked', subscriber: 'full',   editor: 'full',   admin: 'full' },
    'public-and-private': { anonymous: 'full',   subscriber: 'full',   editor: 'full',   admin: 'full' },
    'concert':            { anonymous: 'full',   subscriber: 'full',   editor: 'full',   admin: 'full' },
    'recurring':          { anonymous: 'full',   subscriber: 'full',   editor: 'full',   admin: 'full' },
    'recurring-mixed':    { anonymous: 'full',   subscriber: 'full',   editor: 'full',   admin: 'full' },
    'no-public-date':     { anonymous: 'hidden', subscriber: 'hidden', editor: 'hidden', admin: 'hidden' },
};

// Calendar / REST between-dates (S2/R1): same as the list, but a date in range
// shows regardless of past/future — so a PUBLIC past date is visible here.
export const calendarMatrix: Record<CatalogueKey, Record<Role, Vis>> = {
    ...listMatrix,
    'time-past': { anonymous: 'full', subscriber: 'full', editor: 'full', admin: 'full' },
};

// Archive / front-end search (S7/S8): list the EVENT only if it has >=1 PUBLIC date.
export const archiveListable: Record<CatalogueKey, boolean> = {
    'post-publish': true, 'post-draft': false, 'post-pending': false, 'post-private': false, 'post-future': false,
    'date-public': true, 'date-private': false, 'date-pending': false, 'date-planned': false, 'date-option': false,
    'time-future': true, 'time-past': false,
    'private-only': false, 'public-and-private': true, 'concert': true, 'recurring': true,
    'recurring-mixed': true, 'no-public-date': false,
};

/**
 * event-dates block (single page, S5/F1) — how many date rows each role should
 * see for the mixed recurrence, and how many of those are masked to "private".
 * recurring-mixed = 2 PUBLIC + 1 PRIVATE + 1 PLANNED (all future).
 */
// Public feed: PUBLIC + PRIVATE only for everyone (workflow states hidden even
// for editors). recurring-mixed = 2 PUBLIC + 1 PRIVATE + 1 PLANNED -> 3 rows.
// The event-dates block shows date/time rows (no per-row title), so there is
// nothing to mask visually; only the row COUNT matters here.
export const eventDatesMixed: Record<Role, { visible: number; masked: number }> = {
    anonymous:  { visible: 3, masked: 0 },
    subscriber: { visible: 3, masked: 0 },
    editor:     { visible: 3, masked: 0 },
    admin:      { visible: 3, masked: 0 },
};
