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

### calendar-subscribe block (`soli/calendar-subscribe`)

Interactive promo widget (`events/blocks/calendar-subscribe/`) that builds a live `/ical` subscribe URL. The
visitor picks **All concerts** and/or **orchestras/groups** (categories used by published events, listed via
`GET /soli_event/v1/feed-categories` → `EventsDatesTableHandler::getFeedCategories()`) from one searchable
multi-select dropdown with removable chips (vanilla JS — scales to many categories); the selection is
OR-combined into the URL (`?categorie=…&concerten=1`) with copy / add-to-calendar (`webcal://`) / download
actions, plus a collapsed "How do I use this?" `<details>` explainer. The editor sets which options are
pre-ticked via `defaultConcerts` / `defaultCategories` attributes (categories via a `FormTokenField` in the
inspector); the front-end (`src/frontend.js`, plain DOM) keeps the URL in sync as the selection changes.
Nothing ticked → the bare feed (whole public agenda).

### event-location-map block (`soli/event-location-map`)

Map card on the single event page (`events/blocks/event-location-map/`, shipped in the FSE template's
aside) showing the venue of the current event date: the `?event=<date id>` date when the visitor followed
the upcoming-dates list, otherwise the next upcoming date. Dates come from
`EventsDatesTableHandler::getUpcomingDatesForEvent()`, so viewer visibility (F1) applies — a workflow-state
date id in the URL never resolves for public viewers. The front end renders Leaflet + OpenStreetMap tiles
(`src/frontend.js`, Leaflet bundled, marker = `inc/assets/img/icons/pin-1.svg` — no API key); the editor
previews via an OSM embed iframe (hidden `isPreview` attribute) because ServerSideRender HTML cannot run
scripts. Coordinates come from `LocationGeocoder` (`events/lib/location_geocoder.php`): the free-text
`wp_event_location.address` (fallback: name) is geocoded once via Nominatim and cached on the row
(`latitude` / `longitude` / `geocoded_address` — an address edit invalidates the cache and re-geocodes);
failures back off via a 6h transient, and the `soli_event_pre_geocode` filter can stub or replace the
provider (tests seed coordinates directly instead). No upcoming date, no location on the shown date, a
failed geocode, or no `soli_event` context at all (site editor / non-event page) → the front end renders
nothing and editors see an explanatory note. Internal dates (rooms booked, no external location) fall back
to the block's **home venue** (`homeName` / `homeAddress` attributes, default "Muziekcentrum, Kerkpad 83,
Santpoort-Noord"); row-less venues cache their geocode in a `soli_event_geocode_<md5>` option instead of a
location row. A date with neither location nor rooms stays hidden.

### my-groups block (`soli/my-groups`)

"Mijn orkesten" panel for the members page (`events/blocks/my-groups/`, ported from the theme's
`page-mijn-pagina` pattern): the logged-in member's groups, each with its next upcoming event. Group
membership comes from the **SSO assignments** the passport plugin syncs at login (user meta
`soli_passport_assignments`, written by laravel-soli-administration's `assignments` claim); each entry only
carries a numeric `onderdeel_id`, so editors link a category to its administration group once via a
term-meta field on the category add/edit screens (`soli_event_onderdeel_id`,
`events/lib/category_onderdeel.php` — also exposes the `soli_event_user_onderdeel_ids` filter). Per matched
category the row shows the next visible date via `getNextConcert(only_concerts=false, category_id)`, so
workflow-state dates never surface (F1); rows sort soonest-first, groups without an upcoming date last with
a "no upcoming events" label. A row links to its next event's single page; a group without an upcoming
event stays unlinked. Anonymous visitors, members without assignments, and
unmapped groups render nothing on the front end; editors see an explanatory note (ServerSideRender previews
with the *editing* user's assignments). Markup reuses the theme's `.soli-flat-panel` / `.soli-orkesten-list`
class names so the theme restyles it; the block ships equivalent scoped fallback styles (calendar glyph
inlined; the theme's `--soli-ic` wins when set).

### Invoice dialog ("Invoice this event")

Editor-only surface belonging to the create-event block
(`events/blocks/create-event/src/components/invoice-button/`), reachable from two places once the event has
at least one date: an icon button in the **editor header** (left of Publish/Save) and a button in the
**"Invoice" document sidebar panel**. The header has no public slot for a plain button - `PinnedItems` is
only reachable through `PluginSidebar`, which would replace the dialog with a sidebar - so
`useEditorHeaderSlot()` parks an own container in `.editor-header__settings` and portals the trigger into
it; if that markup ever disappears the button falls back into the block, so the feature is never lost. The
sidebar entry is the official `PluginDocumentSettingPanel` fill, rendered straight from the block tree (no
`registerPlugin`), which keeps both triggers inside the events context and therefore on **live, unsaved**
editor state.

The dialog lists the dates with a from/until range filter; the range defaults to the event's own first/last
date, so **every date starts selected** and the editor unticks what should not be invoiced. Durations are
measured **between whole minutes** (`durationInHours()`) because stored dates carry stray seconds - a
12:00-14:30 date must read 2,50 hours, not 2,48.

### Invoice document (`invoice-docx.js`)

Generating produces a `.docx` **client-side** (the `docx` npm package in the create-event workspace; no
server round-trip, no PHP dependency, so nothing is stored or exposed): sender block, invoice number /
date / due date, recipient and subject lines, one table, and payment terms with IBAN/KvK/VAT fill-in
blanks. Values the repo does not know are left blank on purpose rather than invented.

Everything numeric lives in **one table** - date lines plus the total-hours, hourly-rate, subtotal,
VAT-percentage, VAT and total rows - wired together with **same-table cell reference fields**
(`=D2*E7`, `=SUM(D2:D4)*E7`), so changing the hourly rate or VAT percentage in Word and pressing F9
recalculates every amount. Three rules keep that working, all learned by rendering the output:

- **Cell references only.** `SUM(ABOVE)` and bookmark references silently evaluate to **0** outside Word,
  so the totals must reference cells, and never a cell that itself holds a field (subtotal/VAT/total each
  recompute from the hours and rate cells instead).
- **No merged cells in the table.** A merged label renumbers the row for formula purposes, so the value
  cell stops being addressable as column E ("Expression is faulty"). Summary rows keep all five cells.
- **Bare numbers in referenced cells.** A "€" in the cell makes it unparseable, so the currency sits in the
  column header (`Amount (€)`).

Widths are explicit **twips** (`WidthType.DXA`, A4 minus 2 cm margins): a percentage width serialises as
`w:w="100%"`, which Word falls back to a near-zero auto width. The document also pins its language to
**nl-NL** (`docDefaults`) because the comma decimals in those fields are parsed by run language - with an
English default `50,00` recalculates as 5000.

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
- The block bundle is **not** rebuilt by the test run. After editing anything under a block's `src/`, run
  `npm run build --workspace=<block>` first or the spec drives the previous bundle.
- `e2e/invoice.spec.ts` asserts the generated `.docx` by unzipping `word/document.xml` with the dependency-
  free reader in `e2e/docx-utils.ts`.

Run: `npm run test:playwright`.
