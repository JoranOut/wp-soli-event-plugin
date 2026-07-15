import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { addDays, format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';

// Unique per-test identifier so concurrent tests never collide on shared state.
function uniqueTitle(base: string) {
    return `${base} ${Math.random().toString(36).slice(2, 10)}`;
}

// The MUI-heavy Create Event block can take several seconds to paint on CI's
// constrained runner (fast locally). Give block-load waits generous headroom.
const BLOCK_LOAD_TIMEOUT = 30_000;

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
        // the calendar renders every event, including concurrent tests'.
        const eventLink = page.getByRole('link', { name: eventCtx.title });
        await expect(eventLink).toBeVisible({ timeout: 30000 });
        await expect(eventLink).toContainText(eventCtx.startTime);
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

type CreateEventOptions = {
    title?: string;
    date?: Date;
    startTime?: string;
    endTime?: string;
    locationLabel?: string;
    roomLabel?: string;
    status?: string;
};

// Reusable helper to create a single event with default settings
async function createSingleEvent(
    { admin, page }: { admin: any; page: any },
    overrides: CreateEventOptions = {}
) {
    const {
        title = 'Single Event Concert',
        date = addDays(new Date(), 1),
        startTime = '12:12',
        endTime = '13:13',
        locationLabel = 'Muziekcentrum',
        roomLabel = 'Grote zaal',
        status = 'PUBLIC',
    } = overrides;

    // Go to Events -> Add New Event
    await admin.visitAdminPage('/edit.php?post_type=soli_event');
    await page.getByRole('link', { name: 'Events' }).first().click();
    await page.locator('#wpbody-content').getByRole('link', { name: 'Add New Event' }).click();

    await page.locator('#editor').waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
    const guide = page.locator('.components-guide');
    const eventBlock = page.getByLabel('Block: Create Event');

    // The Create Event block renders a stack of heavy MUI components
    // (date/time pickers, selectors, editors) synchronously. On CI's
    // constrained runner this paint can take several seconds, so allow a
    // generous timeout — the welcome guide is disabled, so its waitFor only
    // rejects at the timeout and must not lose the race before the block paints.
    const winner = await Promise.race([
        guide.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }).then(() => 'guide'),
        eventBlock.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }).then(() => 'title'),
    ]);

    if (winner === 'guide') {
        await page.keyboard.press('Escape');
        await expect(guide).toBeHidden();
        await eventBlock.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
    }

    // Fill in event details
    await page.getByRole('textbox', { name: 'Add title' }).fill(title);

    // Enter the date into the MUI masked field (D MMMM, YYYY). Land on the
    // leftmost (day) section, then type the digits consecutively and let MUI's
    // section auto-advance carry across day -> month -> year. A single ddMMyyyy
    // blast (or manual ArrowRight between sections) misaligns and yields garbage.
    const dateInput = page.getByRole('textbox', { name: 'DD MMMM, YYYY' }).first();
    await dateInput.click();
    await dateInput.press('ArrowLeft');
    await dateInput.press('ArrowLeft');
    await dateInput.press('ArrowLeft');
    await page.keyboard.type(format(date, 'dd', { locale: enUS }), { delay: 100 });
    await page.keyboard.type(format(date, 'MM', { locale: enUS }), { delay: 100 });
    await page.keyboard.type(format(date, 'yyyy', { locale: enUS }), { delay: 100 });
    await dateInput.press('Tab');

    await page.getByRole('textbox', { name: 'hh:mm' }).first().fill(startTime);
    await page.getByRole('textbox', { name: 'hh:mm' }).nth(1).fill(endTime);

    await page.getByRole('button', { name: 'Kies een locatie' }).click();
    await page.getByRole('checkbox', { name: locationLabel }).check();
    await page
        .locator('label')
        .filter({ hasText: roomLabel })
        .getByTestId('CheckBoxOutlineBlankIcon')
        .click();
    await page.getByRole('button', { name: 'Opslaan' }).click();

    // Make it public & publish
    await page.locator('.MuiButtonBase-root.MuiSwitch-switchBase').click();
    await page.getByRole('combobox', { name: 'OPTION' }).click();
    await page.getByRole('option', { name: status }).click();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page
        .getByLabel('Editor publish')
        .getByRole('button', { name: 'Publish', exact: true })
        .click();

    await expect(page.getByTestId('snackbar')).toBeVisible();
    await expect(page.getByTestId('snackbar')).toContainText('Post published.View Event');

    const formattedUS = format(date, 'MMMM d, yyyy', { locale: enUS });
    const formattedEditor = format(date, 'dd MMMM, yyyy', { locale: nl });
    const formattedFrontend = format(date, 'dd MMMM yyyy (EEEE)', { locale: enUS });

    return {
        date,
        formattedUS,
        formattedEditor,
        formattedFrontend,
        title,
        startTime,
        endTime,
        locationLabel,
        roomLabel,
        status,
    };
}

type CreateCalendarPageOptions = {
    title?: string;
};

async function createCalendarPage(
    { admin, page, editor }: { admin: any; page: any; editor: any },
    options: CreateCalendarPageOptions = {}
) {
    const { title = 'Calendar' } = options;

    // Use the official editor fixtures instead of hand-driving the iframe
    // canvas: createNewPost handles editor load + welcome guide + title, and
    // insertBlock inserts programmatically (no timing-sensitive canvas clicks,
    // which were flaky on CI's headless runner).
    await admin.createNewPost({ postType: 'page', title });

    await editor.insertBlock({ name: 'soli/event-view-calendar' });
    await editor.insertBlock({ name: 'soli/event-reservation-popup' });

    await editor.publishPost();

    // Navigate to the published page on the front end.
    const permalink = await page.evaluate(() =>
        window.wp.data.select('core/editor').getPermalink()
    );
    await page.goto(permalink);

    // At this point, `page` is the front-end Calendar page.
    return { title };
}