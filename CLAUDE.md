# wp-soli-event-plugin

Recurring event management for Soli: concerts, rehearsals, and performances. Events are a custom post
type (`soli_event`) whose recurrence dates live in a dedicated `wp_event_dates` table (one row per date),
surfaced through REST, Gutenberg blocks, an FSE single-event template, and admin screens.

## Data model

- **Post type** `soli_event` (`public`, `has_archive`, rewrite slug `evenement`), standard `category` taxonomy.
- **`wp_event_dates`** (`EventsDatesTableHandler`): one row per date — `start_date`, `end_date`, `location`,
  `rooms`, `status`, `notes`, `admin_notes`, `is_concert`.
- **`wp_event_location`** (`LocationTableHandler`): named external venues.
- **Change log** (`EventsLogTableHandler`): session-aggregated before/after diffs of date edits.

### Event-date `status`

`PUBLIC`, `PRIVATE`, `PENDING_APPROVAL`, `PLANNED`. Note the JS default in `inc/values.js` is historically
`OPTION` (an alias for the "not-yet-scheduled" state); treat `OPTION` and `PLANNED` identically — both are
non-public workflow states. Compare status values case-sensitively as UPPERCASE.

## Event visibility policy (authoritative)

All visibility decisions go through **`EventVisibility`** (`events/lib/event_visibility.php`) — the single
source of truth. Do not re-implement status filtering or title masking inline; extend the helper.

**Axes:** post status (public read requires `publish`), event-date status, viewer role, past/future.

### Public feeds — list, calendar, event-dates, concert-hero, next-concert, archive, site search

- Show **PUBLIC + PRIVATE dates only**, for **every** viewer (anonymous, subscriber, editor, admin).
- Workflow states (`PENDING_APPROVAL`, `PLANNED`, `OPTION`) **never** appear on a public feed — not even to
  editors (they manage those in wp-admin / the create-event block, and read them via `GET /events/{id}`).
- **PRIVATE title masking is login-aware:** masked to `private` for not-logged-in visitors; shown in full to
  any logged-in user. Implemented via `EventVisibility::titleSelectExpr()` (SQL) and `maskTitle()` (PHP).
- **Time:** list / concert-hero / next-concert / event-dates show future dates; calendar / archive / search
  show any date in range (past included for the calendar).
- **Archive + site search** additionally require the event to have **≥1 PUBLIC future date** (non-editors);
  enforced in `post_type_query.php` with a `post_type`-conditional `EXISTS` so mixed-type searches are safe.

### Single event page

A not-logged-in visitor opening an event with **no PUBLIC date** gets **HTTP 403**
(`template_redirect` guard in `single_event_template.php`). Logged-in users may view it.

### iCal feed — `/ical`

Public calendar export (`events/lib/ical_feed.php`, RFC 5545 VCALENDAR, `text/calendar`). Exports **PUBLIC
upcoming dates only** — PRIVATE and workflow-state dates are never included (stricter than on-site feeds: an
export must not leak private events even masked). Filter with `?categorie=<slug|id>` (alias `?category=`),
which also accepts a comma-separated list (OR: an event matches if it is in any listed category); unknown
entries are dropped and a request of only-unknowns returns an empty calendar. Filter to concerts with
`?concerten=1` (alias `?concerts=1`, matches dates flagged `is_concert`), **OR-combined** with the category
filter — e.g. `?concerten=1&categorie=harmonie` exports concert dates OR Harmonie dates. The concerts flag is
always a valid condition, so it never triggers the empty-calendar case. No authenticated/per-user variant.
Registered via a rewrite rule (`^ical/?$`), flushed on activation and once per `ICAL_REWRITE_VERSION` bump.
`/ical` 301-redirects to `/ical/` (WP trailing-slash canonical). Data via
`EventsDatesTableHandler::getPublicFutureDatesForFeed($category_ids, $concerts_only)`.

### Editing / admin surfaces (role-aware exception)

- `GET /events/{id}` (used by the create-event block) returns rows filtered by viewer via
  `EventVisibility::filterVisibleRows()`: **editors see every status**, others see PUBLIC + PRIVATE only.
- `admin_notes` is returned/writable only with the `soli_event_admin_notes` capability (admins).
- Write endpoints `POST /events/{id}` and `POST /location*`, and `/location/search`, require `edit_posts`.
- The admin events list (`edit.php?post_type=soli_event`) shows all statuses to editors; its Future/All
  dropdown is a convenience filter (bypassed when a search term is active).

### Quick matrix (public list/calendar)

| date status | anonymous | logged-in (any role) |
|---|---|---|
| PUBLIC | full | full |
| PRIVATE | shown, title masked `private` | full title |
| PENDING_APPROVAL / PLANNED / OPTION | hidden | hidden |

## Testing

E2E in `/e2e` (Playwright, TypeScript, wp-env). The visibility contract is locked by a seeded catalogue
(`e2e/fixtures/seed.php`) covering every post_status × date_status × time cell, per-role fixtures
(`e2e/fixtures/roles.ts` — anonymous/subscriber/editor/admin, with X-WP-Nonce replay for authenticated REST),
and one spec per surface. `e2e/global-setup.ts` seeds and mints storage states.

Gotchas:
- Anonymous contexts **must** use an explicit empty storage state — manual `newContext()` calls otherwise
  inherit the config's admin `use.storageState` and are silently authenticated.
- The run env activates a **block theme** (`twentytwentyfive`) so the FSE single-event template renders, and
  sets `posts_per_page=100` for deterministic archive/search. Env locale is `en_US`, so specs assert English
  msgids for UI strings (room/location names are data and stay Dutch).

Run: `npm run test:playwright`.
