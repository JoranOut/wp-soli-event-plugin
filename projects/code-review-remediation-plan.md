# Code Review Remediation Plan — wp-soli-event-plugin

**Created:** 2026-07-14
**Source:** Full code review of the event plugin (PHP REST/table layer + all four Gutenberg blocks).
**Baseline version at review:** PHP/README `1.1.3`, `package.json` `1.0.0` (desynced — see Phase 4).

This plan is ordered by risk. Each phase is independently shippable as one or more PRs. Ticked boxes track completion. File paths are repo-relative.

---

## Execution status (2026-07-15)

Executed as five stacked branches (each builds on the previous):
`feature/security-hardening-rest` → `feature/fix-crashes-and-broken-features`
→ `feature/save-and-fetch-lifecycle` → `feature/build-and-standards-infra`
→ `feature/dedup-and-i18n`. All four blocks build; the e2e suite passes (8/8)
on the cumulative branch.

- **Phase 1 (security):** ✅ done. Also absorbed 2.1 (location UPDATE) while
  removing the `replaceNullWithNull` hack.
- **Phase 2 (crashes/broken features):** ✅ done.
- **Phase 3 (save & fetch lifecycle):** ✅ done.
- **Phase 4 (build/versioning/migrations):** ✅ done. Version synced to 1.1.3
  (owner-confirmed).
- **Phase 5:** correctness cleanups (5.3), dead-code removal (5.4), high-value
  accessibility (5.5), calendar editor attributes, and the recurrence/mapper
  correctness fixes are ✅ done. i18n (5.2) has its **infrastructure** done
  (text domain, loader, `wp_set_script_translations`, `/languages`, build
  scripts); the **exhaustive JS string wrapping + nl_NL/en_US catalogs are
  deferred** (large, and needs an owner decision on source language). The full
  **shared-module dedup (5.1) is deferred** — it is purely structural (the
  room-mapper bug it would prevent is already fixed in each copy) and is the
  highest-regression-risk change, best done as its own PR with e2e coverage.

Not yet pushed / no PRs opened — awaiting go-ahead.

---

## How to work this plan

- Follow the branch/PR workflow in the root `CLAUDE.md` (feature branches, no version bumps during dev; releases are a separate, owner-driven flow).
- **Do not bump version numbers as part of these fixes** except where Phase 4 explicitly deals with version sync — and even then, ask before bumping.
- Each phase below lists concrete acceptance criteria. Add an e2e test for every behavioral fix; several of these bugs shipped precisely because the path had no coverage.
- Security fixes (Phase 1) should go out first and on their own branch.

---

## Phase 1 — Security (do first, ship alone)

**Branch:** `feature/security-hardening-rest`

### 1.1 Admin notes leak on the public GET endpoint — **critical**
- **Where:** `events/lib/events_endpoints.php:47,114` (`filterAdminNotesFromDatesIfNoPermission`) + `events/lib/events_date_table.php:65`.
- **Problem:** The GET `/soli_event/v1/events/{id}` endpoint is public (`__return_true`) and selects `admin_notes`. The filter function is passed the `WP_REST_Response` object instead of the rows array, and checks `$date->admin_notes` (object syntax) against associative-array rows — so it never strips anything. Anonymous users can read every event's admin notes.
- **Fix:**
  - Rewrite `filterAdminNotesFromDatesIfNoPermission()` to operate on the response **data** (array of assoc rows), using array syntax (`$date['admin_notes']`), and write the filtered data back onto the response.
  - Alternatively (preferred): stop selecting `admin_notes` in `loadEventDatesFromDb` unless `current_user_can('soli_event_admin_notes')`, so privileged data never leaves the DB layer for unprivileged callers.
- **Acceptance:** Unauthenticated request to `/events/{id}` returns no `admin_notes` key; authenticated user with the capability still sees it. Add e2e coverage for both.

### 1.2 SQL injection in `removeRedundantDates` — **critical**
- **Where:** `events/lib/events_date_table.php:169`.
- **Problem:** Client-supplied date `id`s are `implode(',', ...)`'d raw into `AND id NOT IN (...)`. Any `edit_posts` user (contributor+) can inject SQL.
- **Fix:** Cast every id to int (`array_map('intval', ...)`) before imploding, or build a `%d` placeholder list and pass through `$wpdb->prepare`. Reject the request if any id is non-numeric.
- **Acceptance:** Posting a non-numeric/injection id is rejected or safely coerced; add a unit-style e2e that a crafted id cannot alter other rows.

### 1.3 Unprepared `LIMIT $limit` on public location search — **high**
- **Where:** `events/lib/location_table.php:73` (`searchLastUsedLocations`).
- **Problem:** `$limit` from the public `limit` query param is interpolated into the SQL string unprepared.
- **Fix:** Use `%d` and pass `$limit` through `$wpdb->prepare` (mirror `searchLocationByNameAndAddress`). Also clamp `$limit` to a sane max in `location_endpoints.php`.
- **Acceptance:** Injection via `limit` is impossible; oversized values are clamped.

### 1.4 Unpublished event statuses leak to the public calendar — **high**
- **Where:** `events/lib/events_date_table.php:124` (`loadAllBetweenDatesEventDatesFromDb`).
- **Problem:** The public between-dates query returns `PLANNED` / `PENDING_APPROVAL` dates; only `PRIVATE` titles are masked. Internal/unpublished events are visible on the public calendar.
- **Fix:** Add `AND d.status IN ('PUBLIC','PRIVATE')` (or explicitly exclude planning statuses) to the public query, consistent with the future-events query. Confirm the intended visibility rules with the owner before finalizing the status whitelist.
- **Acceptance:** Public calendar shows only publicly-visible statuses; admin calendar view (privileged) still shows all.

### 1.5 Remove the committed auth cookie — **high**
- **Where:** `artifacts/storage-states/admin.json` (tracked; contains a live WordPress session cookie).
- **Fix:** `git rm --cached` the file, add `artifacts/` (or the storage-states path) to `.gitignore`, and regenerate storage state at test time. Invalidate the leaked session (change the admin password / salt on any environment where it was valid).
- **Acceptance:** File is untracked and ignored; CI still produces its own storage state.

### 1.6 Replace the `replaceNullWithNull` hack — **medium (correctness + injection-adjacent)**
- **Where:** `events/lib/events_date_table.php:250`, `events/lib/location_table.php:125`.
- **Problem:** `str_replace("'NULL'", "NULL", $query)` runs *after* `prepare()` and would corrupt any legitimate value equal to the string `NULL`.
- **Fix:** Build queries that pass real `NULL` via conditional SQL or `NULLIF`, or insert typed values so `prepare` emits `NULL` correctly. Remove the post-hoc string replacement.
- **Acceptance:** A location/date whose text field is literally `"NULL"` round-trips intact.

---

## Phase 2 — Hard bugs (crashes & broken features)

**Branch:** `feature/fix-crashes-and-broken-features`

### 2.1 Location UPDATE query is a syntax error — **high**
- **Where:** `events/lib/location_table.php:110-118`.
- **Problem:** Trailing comma after `address = %s,` before `WHERE` — every location edit fails; only inserts work.
- **Fix:** Remove the trailing comma.
- **Acceptance:** Editing an existing location persists; add e2e.

### 2.2 `useNumberInput` crash in the repeat generator — **high**
- **Where:** `events/blocks/create-event/src/components/time-generator-modal-button/numbered-input.js:13`.
- **Problem:** `useNumberInput(props)` is called but never imported → selecting the count-based ("Aantal") repeat method throws `ReferenceError` and the block errors out.
- **Fix:** Import the hook from the correct package (MUI Base `@mui/base/useNumberInput`) or replace with the intended component. Verify the whole count-based generation path end to end.
- **Acceptance:** Generating N repeated dates by count works; add e2e for the count path.

### 2.3 "Copy notes" toggle wired wrong — **high**
- **Where:** `events/blocks/create-event/src/components/time-generator-modal-button/time-generator-modal-button.js:314-333`.
- **Problem:** MUI `onChange(event, checked)` handler names its first param `useNotes` (it's the event), calls `setNotes(useNotes)` instead of `setUseNotes(checked)`, and uses `value=` instead of `checked=`.
- **Fix:** `onChange={(_, checked) => setUseNotes(checked)}`, `checked={useNotes}`. Confirm generated events copy notes only when on.
- **Acceptance:** Toggle reflects state, notes are copied to generated dates only when enabled; add e2e.

### 2.4 Literal `location.name` / `location.address` rendered — **high (public-facing)**
- **Where:** `events/blocks/create-event/src/components/selected-date/selected-date.js:56-57`.
- **Problem:** Missing braces → visitors see the text "location.name location.address".
- **Fix:** `{location.name}` / `{location.address}`.
- **Acceptance:** Published event shows the real venue; add e2e assertion.

### 2.5 Room mapper uses slug as array index (calendar + reservation) — **high**
- **Where:** `events/blocks/event-view-calendar/src/components/events-provider/event-mapper.js:38,43`; same in `event-reservation-popup/.../event-mapper.js:35,40`.
- **Problem:** `rooms` are stored as slugs; `ROOM_SLUGS[slug]` / `ROOM_NAMES[slug]` is always `undefined`. Room styling/filtering silently broken. The list block's mapper is correct (`indexOf`).
- **Fix:** Best resolved by the dedup in Phase 5 (single shared mapper). Interim: use `indexOf` like the list block.
- **Acceptance:** Calendar events get correct room classes; add e2e verifying a room class is present.

### 2.6 Reservation email placeholder — **high**
- **Where:** `events/blocks/event-reservation-popup/src/components/email-button/email-button.js:42`.
- **Problem:** mailto targets `recipient@example.com`.
- **Fix:** Make the recipient a block attribute / plugin setting; default to the correct Soli address. Confirm address with owner.
- **Acceptance:** Generated mail is addressed correctly; recipient configurable.

### 2.7 Calendar detail popup mis-positions and broken image — **high/medium**
- **Where:** `events/blocks/event-view-calendar/src/components/event-detail-pop-up/event-detail-pop-up.js:35-45,60`.
- **Problem:** Reads `offsetLeft`/`offsetTop` off a `getBoundingClientRect()` `DOMRect` (no such props) → `NaNpx` → popup mis-placed. `props.event.raw?.featuredImage` path never exists → broken `<img>`.
- **Fix:** Use `DOMRect` properties (`left`/`top`/`right`/`bottom`/`width`/`height`) with scroll offsets; map `featured_image` through the endpoint + mapper (see 5.x) or drop the image.
- **Acceptance:** Popup appears anchored to the clicked event; image either shows or is removed cleanly.

### 2.8 `show_navigation` never reaches the frontend — **high**
- **Where:** `events/blocks/event-view-list/index.php:27-30` + `src/frontend.js:9`.
- **Problem:** Editor sets `show_navigation`; `theHTML()` only outputs `data-events_per_page`; frontend reads `data-navigation`.
- **Fix:** Output `data-navigation` from `theHTML()` and read the same attribute name in `frontend.js`. Align naming.
- **Acceptance:** Toggling "Show Navigation" changes frontend pagination; add e2e.

---

## Phase 3 — Data-loss & fetch-lifecycle

**Branch:** `feature/save-and-fetch-lifecycle`

### 3.1 Autosave silently persists half-edited events — **high (data loss)**
- **Where:** `events/blocks/create-event/src/components/events-provider/admin-events-provider.js:9-41`.
- **Problem:** Triggers on `isSavingPost()` with no autosave guard; Gutenberg autosaves POST in-progress dates, and the server's `removeRedundantDates` deletes rows not in the payload.
- **Fix:** Guard with `!isAutosavingPost()` and `isSavingNonPostEntityChanges()` as appropriate; only fire on a real, user-initiated save. Surface POST failures to the user (notice), not just `console.error`.
- **Acceptance:** Autosave does not write event dates; a failed save shows an error notice; add e2e simulating autosave.

### 3.2 Dirty state never rebased after save — **medium**
- **Where:** `admin-events-provider.js` + `events-context/events-provider.js`.
- **Problem:** POST response (fresh DB ids) is discarded; generated events keep `id: undefined`, so each save deletes/re-inserts them (id churn breaks `?event={id}` deep links); "Reset" reverts to page-load snapshot, diverging from DB.
- **Fix:** On save success, dispatch the returned rows back into context (rebase state + `initialHash`). Provide an `onSaveComplete` path.
- **Acceptance:** After save, ids are stable across subsequent saves; Reset reverts to last-saved state.

### 3.3 Concurrent-save race — **medium**
- **Where:** `admin-events-provider.js` save effect deps.
- **Problem:** `events` in deps → a change during an in-flight save fires a second overlapping delete/insert cycle.
- **Fix:** Track an in-flight flag; do not start a second POST until the first resolves. `useCallback` the handlers.
- **Acceptance:** No overlapping POSTs under rapid edits.

### 3.4 Dropped / dead-end fetches in view blocks — **medium**
- **Where:** `event-view-calendar/.../events-provider.js:80,91-93,104`; `event-view-list/.../events-provider.js:13-20`.
- **Problems:** (a) navigation fetch skipped while loading and never retried; (b) once `error` set, no refetch ever; (c) `filters` used but not a dep and no abort on cleanup; (d) list block doesn't handle 204 (`response.events` throws on `null`).
- **Fix:** Rework the fetch effect: depend on the real inputs (`range`/`page`/`filters`), use an `AbortController` with cleanup (the reservation block already does this — converge on it), clear `error` on new inputs to allow retry, and null-guard 204 responses with an empty-state render.
- **Acceptance:** Fast month/page navigation always ends on correct data; a transient error recovers on next navigation; empty result renders an empty state, not a crash.

### 3.5 Invalid-date guards in date pickers — **medium**
- **Where:** `create-event/.../daterange-picker/daterange-picker.js:98-128,164-177`; `event-reservation-popup/.../daterange-picker/daterange-picker.js:100-113,166-179,45-47`; `events-context/events-hash.js:7`.
- **Problem:** MUI TimePicker/DateTimePicker pass `null`/invalid dayjs on cleared or partial input; unguarded `.toDate()`/`.date()`/`toISOString()` throw and unmount the modal (no error boundary).
- **Fix:** Validity-guard every onChange before committing; make `isDateInValid` null-safe; guard `toHash` against invalid dates.
- **Acceptance:** Clearing/partially typing a time never crashes the block.

---

## Phase 4 — Build, release & project-standard infrastructure

**Branch:** `feature/build-and-standards-infra`

### 4.1 Calendar block is never built — **high**
- **Where:** `package.json` `workspaces`.
- **Problem:** Workspaces list `events/blocks/event-view-monthly` (doesn't exist) and omit `event-view-calendar`; `npm run build` skips the calendar block, so releases ship a stale/absent bundle.
- **Fix:** Replace the phantom `event-view-monthly` entry with `events/blocks/event-view-calendar`. Verify `npm run build` builds all four blocks.
- **Acceptance:** Fresh `npm run build` produces up-to-date `build/` for all four blocks.

### 4.2 Version desync — **high**
- **Where:** `package.json` (`1.0.0`) vs PHP header/constant + README (`1.1.3`).
- **Problem:** Nightly/publish read `package.json` → wrong version shipped. CLAUDE.md requires all four locations match.
- **Fix:** **Ask the owner** which version is authoritative, then sync all four locations (PHP header, `SOLI_EVENT__PLUGIN_VERSION`, `README.md` `~Current Version:~`, `package.json`). Follow the release process in CLAUDE.md; do not tag as part of a feature PR.
- **Acceptance:** All four version locations agree.

### 4.3 No DB migration mechanism — **medium/high**
- **Where:** Plugin bootstrap (`soli-event-plugin.php`), new `includes/` migration handler.
- **Problem:** Schema is only created on activation; CLAUDE.md documents an `admin_init` version-check + `dbDelta` migration pattern that doesn't exist. Existing installs won't receive schema changes.
- **Fix:** Add `soli_event_db_version` option tracking + `admin_init` check calling `dbDelta` on the current `CREATE TABLE` definitions (idempotent). Establish this now so future schema changes are safe.
- **Acceptance:** Bumping the plugin version re-runs `dbDelta` once and records the new DB version; no-op on matching versions.

### 4.4 Stray Node-only import in the browser bundle — **medium**
- **Where:** `events/blocks/event-view-calendar/src/components/calendar-wrapper/calendar-wrapper.js:16`.
- **Fix:** Delete `import {logs} from "@wordpress/env/lib/commands"`.
- **Acceptance:** Import gone; bundle + `*.asset.php` deps clean.

### 4.5 Editor `index.php` fixes for CI-verifiable download of build artifacts
- Confirm the E2E workflow (`.github/workflows/test.yml`) still builds and passes after workspace fix. Consider committing build artifacts only if the release process depends on them (currently `build/` is not tracked — keep it that way and rely on the build step).

---

## Phase 5 — De-duplication & i18n sweep (quality)

**Branch:** `feature/dedup-and-i18n`

### 5.1 Extract shared block modules — **medium**
- **Problem:** ~20–25% of view-block JS is near-duplicate; the three event mappers have already diverged into the room bug (2.5). Duplicated: three provider+mapper pairs, two `rooms-dropdown`, `email-button`/`text-copy-button`, `splitEventsOnRooms`, four copies of `isSameDay`/`addHours`.
- **Fix:** Create a shared module (alongside `events/inc/values.js`) hosting: one event mapper (slug-correct), one fetch provider (AbortController + retry + 204-safe), one rooms-dropdown, and the date helpers. Refactor all blocks to consume it.
- **Acceptance:** Single source for each; 2.5 and 3.4 resolved centrally; bundle size not regressed.

### 5.2 i18n across all four blocks + PHP — **medium**
- **Problem:** Zero `__()` in any block `src/`; hardcoded mixed Dutch/English. No `/languages` folder, no `load_plugin_textdomain`. PHP uses placeholder/inconsistent text domains (`'your_text_domain'`, `'soli_events'`).
- **Fix:**
  - Settle on one text domain (e.g. `soli-event`) and use it everywhere.
  - Wrap all user-facing strings in `__()` / `_x()` (JS via `@wordpress/i18n`, PHP via core functions).
  - Add `load_plugin_textdomain` and a `/languages` folder; wire `wp_set_script_translations` for the blocks.
  - Add the i18n build scripts (`i18n:make-pot`/`make-mo`/`make-json`) per CLAUDE.md and generate `nl_NL` + `en_US`.
- **Acceptance:** No hardcoded UI strings; `.pot` extracts them; both locales load.

### 5.3 Correctness cleanups bundled here — **low/medium**
- `current_time('Y-m-d H:m:s')` → `'Y-m-d H:i:s'` (minutes, not month) in `events/lib/events_date_table.php:78,101`.
- `getLocationByEvent` (`location_table.php:40`) missing `return`.
- De Morgan filter bug (`event-view-calendar/.../events-provider.js:56`, use `&&`) and `false` values pushed into filters (`calendar-filter.js:31`).
- Calendar block: register editor attributes/InspectorControls so `type`, `adjustable`, `show-rooms-filter`, concert mode are reachable (`event-view-calendar/index.php:28` + `src/index.js`).
- `location-searcher` inverted error handling (stuck "Loading...") + double-encoded query (`encodeURI` + `addQueryArgs`).
- Notes/admin-notes editors resync from props on change.
- Remove production `console.log`s and always-on payload logging (which dumps capability-gated `adminNotes`).
- Swap the mislabeled FullCalendar plugin imports (`calendar-wrapper.js:7-8`).
- `event-detail-pop-up` outside-click: dismiss on first click; switch events without closing.

### 5.4 Dead code removal — **low**
- `create-event`: `state-store.js`, `time-picker/time-picker-button.js`, `repeated-date-accordeon/selected-date.js`.
- `event-view-calendar`: `month-display/month-display.js`.
- `inc/assets/img/icons/svg_list.js` (unused by these blocks — confirm no other consumer before deleting).
- Unused helper params (`endRepeatDate` in `*Times` generators).

### 5.5 Accessibility pass — **low**
- `alt`/`aria-label` on all `<img>` and icon-only buttons.
- Replace `href="#"` pagination anchors with `<button>`.
- Detail popup: `role="dialog"`, focus handling, Escape to close.
- Fix duplicate DOM ids (`start-date`, `event-status-label`, `demo-simple-select-label`) when multiple instances render.
- Fix `incrementByMonth` month-overflow (`time-generator-helpers.js:70`) and `utcToLocal`/`Date.prototype` pollution (`create-event/.../event-mapper.js:58`) — arguably correctness; group with 5.1's mapper work.

---

## Suggested PR sequence

1. `feature/security-hardening-rest` (Phase 1) — ship first, standalone.
2. `feature/fix-crashes-and-broken-features` (Phase 2).
3. `feature/save-and-fetch-lifecycle` (Phase 3).
4. `feature/build-and-standards-infra` (Phase 4) — coordinate 4.2 version bump with owner + release flow.
5. `feature/dedup-and-i18n` (Phase 5) — largest; can be split further (dedup, then i18n, then a11y).

## Testing note

Every behavioral fix gets a Playwright e2e test in `e2e/`. The crashes in 2.2/2.3 and the data loss in 3.1 all shipped because those paths were untested — prioritize covering them. Run the full suite (`npm run test:playwright`) before each PR.

## Explicitly deferred / needs owner input

- 1.4 status whitelist for the public calendar (confirm intended visibility).
- 2.6 reservation recipient address.
- 4.2 authoritative version number and the release itself.
