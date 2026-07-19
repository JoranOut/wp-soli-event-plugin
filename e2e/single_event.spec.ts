import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import {
    createSingleEvent,
    createCalendarPage,
    uniqueTitle,
    DEFAULT_EVENT_STATUS,
} from './helpers';

test.describe('Event Tests',  () => {
    // Tests share one WordPress instance; each isolates itself with a unique
    // event title (see uniqueTitle) rather than wiping global state, so they
    // are safe to run concurrently. Authentication comes from the framework's
    // storageState (see playwright.config.js), so no per-test login is needed.
    test.describe.configure({ mode: 'parallel' });

    test( 'Should load properly', async ( { admin, page }) => {
        await admin.visitAdminPage( '/' );
        await expect(
            page.getByRole('heading', { name: 'Welcome to WordPress', level: 2 })
        ).toBeVisible();
    });

    test( 'displays a message in the posts table when no posts are present',
        async ( {admin, page} ) => {
        // Search for a term no event can match, so the empty-state message
        // shows regardless of events created by concurrent tests.
        const missing = uniqueTitle('no-such-event');
        await admin.visitAdminPage(
            `/edit.php?post_type=soli_event&s=${encodeURIComponent(missing)}`
        );
        await expect(
            page.getByRole( 'cell', { name: 'No Events Found' } )
        ).toBeVisible();
    });

    test('Single event appears correctly in events table', async ({ admin, page }) => {
        const ctx = await createSingleEvent({ admin, page }, { title: uniqueTitle('Single Event Concert') });

        // Search by the unique title so our event is the only row, regardless
        // of events accumulated by concurrent tests (avoids list pagination).
        await admin.visitAdminPage(`/edit.php?post_type=soli_event&s=${encodeURIComponent(ctx.title)}`);

        const eventRow = page.locator('tr.type-soli_event').filter({ hasText: ctx.title });
        await expect(eventRow.locator('td.column-title a.row-title')).toContainText(ctx.title);
        await expect(eventRow.locator('td.column-start_date')).toContainText(
            `${ctx.formattedUS} ${ctx.startTime}`
        );
        await expect(eventRow.locator('td.column-end_date')).toContainText(
            `${ctx.formattedUS} ${ctx.endTime}`
        );
        await expect(eventRow.locator('td.column-location')).toContainText('grote-zaal');
        await expect(eventRow.locator('td.column-status')).toContainText(ctx.status);
    });

    test('Single event shows correct data in editor', async ({ admin, page }) => {
        const ctx = await createSingleEvent({ admin, page }, { title: uniqueTitle('Single Event Concert') });

        // Search by the unique title so our event is the only row, regardless
        // of events accumulated by concurrent tests (avoids list pagination).
        await admin.visitAdminPage(`/edit.php?post_type=soli_event&s=${encodeURIComponent(ctx.title)}`);

        const eventRow = page.locator('tr.type-soli_event').filter({ hasText: ctx.title });
        await eventRow.locator('td.column-title a.row-title').click();

        await expect(page.getByLabel('Add title')).toContainText(ctx.title);
        await expect(page.locator('div.start-date input')).toHaveValue(ctx.formattedEditor);
        await expect(page.locator('div.start-time input')).toHaveValue(ctx.startTime);
        await expect(page.locator('div.end-time input')).toHaveValue(ctx.endTime);
        await expect(page.getByRole('button', { name: 'Grote Zaal' })).toBeVisible();
        await expect(page.getByRole('combobox')).toHaveText(ctx.status);
    });

    test('Single event shows correct data on frontend', async ({ admin, page }) => {
        const ctx = await createSingleEvent({ admin, page }, { title: uniqueTitle('Single Event Concert') });

        // open event from editor snackbar or from list
        // Search by the unique title so our event is the only row, regardless
        // of events accumulated by concurrent tests (avoids list pagination).
        await admin.visitAdminPage(`/edit.php?post_type=soli_event&s=${encodeURIComponent(ctx.title)}`);
        const eventRow = page.locator('tr.type-soli_event').filter({ hasText: ctx.title });
        await eventRow.locator('td.column-title a.row-title').click();

        const page2Promise = page.waitForEvent('popup');
        await page.getByRole('link', { name: 'View Event' }).click();
        const page2 = await page2Promise;

        await expect(page2.locator('h1')).toContainText(ctx.title);
        await expect(page2.locator('#start-date')).toContainText(ctx.formattedFrontend);
        await expect(page2.locator('#start-time')).toContainText(ctx.startTime);
        await expect(page2.locator('#end-time')).toContainText(ctx.endTime);
        await expect(page2.locator('.location a')).toContainText('Muziekcentrum Soli');
        await expect(page2.locator('.location span')).toContainText('Grote zaal');

        await page2.close();
    });

    test('Named location shows in the events admin table', async ({ admin, page }) => {
        const name = `Venue ${Math.random().toString(36).slice(2, 8)}`;
        const address = 'Teststraat 1, Driehuis';
        const ctx = await createSingleEvent(
            { admin, page },
            { title: uniqueTitle('Located Concert'), namedLocation: { name, address } }
        );

        await admin.visitAdminPage(`/edit.php?post_type=soli_event&s=${encodeURIComponent(ctx.title)}`);

        const eventRow = page.locator('tr.type-soli_event').filter({ hasText: ctx.title });
        await expect(eventRow.locator('td.column-location')).toContainText(name);
        await expect(eventRow.locator('td.column-location')).toContainText(address);
    });

    test('Named location shows on the frontend single-event page', async ({ admin, page }) => {
        const name = `Venue ${Math.random().toString(36).slice(2, 8)}`;
        const address = 'Teststraat 1, Driehuis';
        const ctx = await createSingleEvent(
            { admin, page },
            { title: uniqueTitle('Located Concert'), namedLocation: { name, address } }
        );

        await admin.visitAdminPage(`/edit.php?post_type=soli_event&s=${encodeURIComponent(ctx.title)}`);
        const eventRow = page.locator('tr.type-soli_event').filter({ hasText: ctx.title });
        await eventRow.locator('td.column-title a.row-title').click();

        const page2Promise = page.waitForEvent('popup');
        await page.getByRole('link', { name: 'View Event' }).click();
        const page2 = await page2Promise;

        await expect(page2.locator('h1')).toContainText(ctx.title);
        await expect(page2.locator('#location-name')).toContainText(name);
        await expect(page2.locator('#location-address')).toContainText(address);

        await page2.close();
    });

    test('Default event status is visible in the events admin table', async ({ admin, page }) => {
        const ctx = await createSingleEvent(
            { admin, page },
            { title: uniqueTitle('Default Status Concert'), keepDefaultStatus: true }
        );

        await admin.visitAdminPage(`/edit.php?post_type=soli_event&s=${encodeURIComponent(ctx.title)}`);

        const eventRow = page.locator('tr.type-soli_event').filter({ hasText: ctx.title });
        await expect(eventRow.locator('td.column-status')).toContainText(DEFAULT_EVENT_STATUS);
    });

    test('Calendar page shows event in calendar', async ({ admin, page, editor }) => {
        const eventCtx = await createSingleEvent(
            { admin, page },
            {
                title: uniqueTitle('Concert'),
                date: new Date(),
                startTime: '12:12',
                endTime: '13:13',
            }
        );

        await createCalendarPage({ admin, page, editor });

        // We are now on the front-end Calendar page. Scope to our unique event;
        // the calendar renders every event, including concurrent tests'. The
        // month grid shows at most 3 title-only pills per day (matching the
        // agenda design), so with events accumulated by other test runs ours
        // may sit behind today's "+N meer" link - open it in that case.
        const eventLink = page.getByRole('link', { name: eventCtx.title });
        const moreLink = page.locator('.fc-day-today .fc-daygrid-more-link');
        await expect(eventLink.or(moreLink).first()).toBeVisible({ timeout: 30000 });
        if (!(await eventLink.isVisible())) {
            await moreLink.click();
        }
        await expect(eventLink).toBeVisible();
    });

    test('Calendar page reservation popup shows correct event details', async ({ admin, page, editor }) => {
        const eventCtx = await createSingleEvent(
            { admin, page },
            {
                title: uniqueTitle('Concert'),
                date: new Date(),
                startTime: '12:12',
                endTime: '13:13',
            }
        );

        await createCalendarPage({ admin, page, editor });

        // Open reservation popup. The tool lists every event, so scope to the
        // link for our unique event rather than assuming a single result.
        await page.getByRole('button', { name: 'Reserveer' }).click();
        const detail = page.getByRole('link').filter({ hasText: eventCtx.title });
        await expect(detail).toContainText(
            `${eventCtx.title} - Grote zaal`,
            { timeout: 30000 }
        );
        await expect(detail).toContainText(
            `${eventCtx.startTime} - ${eventCtx.endTime}`
        );
    });

    test('Saving clears the unsaved-changes state and logs one aggregated entry', async ({ admin, page }) => {
        const ctx = await createSingleEvent(
            { admin, page },
            { title: uniqueTitle('Dirty State Concert') }
        );

        const isDirty = () =>
            page.evaluate(() =>
                (window as any).wp.data.select('core/editor').isEditedPostDirty()
            );

        // Publishing saved the event dates inside the post save; once the
        // post-save rebase settles, the editor must be clean again (no
        // "leave tab?" warning).
        await expect.poll(isDirty).toBe(false);

        // Editing an event field alone must mark the post dirty...
        await page.getByRole('textbox', { name: 'hh:mm' }).first().fill('14:14');
        await expect.poll(isDirty).toBe(true);

        // ...and updating must clear it again.
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByTestId('snackbar')).toContainText('updated');
        await expect.poll(isDirty).toBe(false);

        // Both saves happened within the idle window, so the Log View must
        // show exactly one aggregated entry for this event.
        await admin.visitAdminPage(
            '/edit.php?post_type=soli_event&page=soli_event_admin_log'
        );
        const logRows = page.locator('tbody tr').filter({ hasText: ctx.title });
        await expect(logRows).toHaveCount(1);
        await expect(logRows.first()).toContainText('Added');
        await expect(logRows.first()).toContainText('14:14');
    });

    test('Admin calendar view shows event with correct time and room', async ({ admin, page }) => {
        const eventCtx = await createSingleEvent(
            { admin, page },
            {
                title: uniqueTitle('Concert'),
                date: new Date(),
                startTime: '12:12',
                endTime: '13:13',
            }
        );

        // Go to the plugin's admin Calendar View. Navigate directly rather than
        // via the admin sidebar, which is hidden while the fullscreen block
        // editor (left open by createSingleEvent) is active.
        await admin.visitAdminPage('/edit.php?post_type=soli_event&page=soli_event_admin_view');

        // Scope to our unique event; the week view shows all events in the week.
        const calendarEventLink = page.getByRole('link', { name: eventCtx.title });

        await expect(calendarEventLink).toContainText(
            `${eventCtx.startTime} - ${eventCtx.endTime}`,
            { timeout: 30000 }
        );
        // Room name is now shown as its display label, not the raw slug.
        await expect(calendarEventLink).toContainText('Grote zaal');
    });


});