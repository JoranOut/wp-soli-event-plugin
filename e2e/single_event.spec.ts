import { test, expect, RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { addDays, format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';

test.describe('Event Tests',  () => {
    test.beforeEach(async ({page, requestUtils}) => {

        await page.goto('/wp-login.php');
        await page.fill('#user_login', 'admin');
        await page.fill('#user_pass', 'password');
        await page.click('#wp-submit');

        expect(page.locator('#wpadminbar')).toBeVisible();

        await deleteAllPostsOfType(requestUtils, 'soli_event');
        await deleteAllPostsOfType(requestUtils, 'pages');

        await page.evaluate(() => {
            // Post editor
            window.wp?.data?.dispatch('core/preferences')
                ?.set('core/edit-post', 'welcomeGuide', false);
            // Site editor (if you touch it)
            window.wp?.data?.dispatch('core/preferences')
                ?.set('core/edit-site', 'welcomeGuide', false);
            // Widgets editor (if you touch it)
            window.wp?.data?.dispatch('core/preferences')
                ?.set('core/edit-widgets', 'welcomeGuide', false);
        });
    });

    test( 'Should load properly', async ( { admin, page }) => {
        await admin.visitAdminPage( '/' );
        await expect(
            page.getByRole('heading', { name: 'Welcome to WordPress', level: 2 })
        ).toBeVisible();
    });

    test( 'displays a message in the posts table when no posts are present',
        async ( {admin, page} ) => {
        await admin.visitAdminPage( '/edit.php?post_type=soli_event' );
        await expect(
            page.getByRole( 'cell', { name: 'No Events Found' } )
        ).toBeVisible();
    });

    test('Single event appears correctly in events table', async ({ admin, page }) => {
        const ctx = await createSingleEvent({ admin, page });

        await admin.visitAdminPage('/edit.php?post_type=soli_event');

        const eventRow = page.locator('tr.type-soli_event');
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
        const ctx = await createSingleEvent({ admin, page });

        await admin.visitAdminPage('/edit.php?post_type=soli_event');

        const eventRow = page.locator('tr.type-soli_event');
        await eventRow.locator('td.column-title a.row-title').click();

        await expect(page.getByLabel('Add title')).toContainText(ctx.title);
        await expect(page.locator('div.start-date input')).toHaveValue(ctx.formattedEditor);
        await expect(page.locator('div.start-time input')).toHaveValue(ctx.startTime);
        await expect(page.locator('div.end-time input')).toHaveValue(ctx.endTime);
        await expect(page.getByRole('button', { name: 'Grote Zaal' })).toBeVisible();
        await expect(page.getByRole('combobox')).toHaveText(ctx.status);
    });

    test('Single event shows correct data on frontend', async ({ admin, page }) => {
        const ctx = await createSingleEvent({ admin, page });

        // open event from editor snackbar or from list
        await admin.visitAdminPage('/edit.php?post_type=soli_event');
        const eventRow = page.locator('tr.type-soli_event');
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

    test('Calendar page shows event in calendar', async ({ admin, page }) => {
        const today = new Date();

        const eventCtx = await createSingleEvent(
            { admin, page },
            {
                title: 'Concert',
                date: today,
                startTime: '12:12',
                endTime: '13:13',
            }
        );

        await createCalendarPage({ admin, page });

        // We are now on the front-end Calendar page
        await expect(page.getByRole('link', { name: eventCtx.title })).toBeVisible();
        await expect(page.getByRole('link', { name: eventCtx.title })).toContainText(
            eventCtx.startTime
        );
    });

    test('Calendar page reservation popup shows correct event details', async ({ admin, page }) => {
        const today = new Date();

        const eventCtx = await createSingleEvent(
            { admin, page },
            {
                title: 'Concert',
                date: today,
                startTime: '12:12',
                endTime: '13:13',
            }
        );

        await createCalendarPage({ admin, page });

        // Open reservation popup
        await page.getByRole('button', { name: 'Reserveer' }).click();
        await expect(page.getByRole('link')).toContainText(
            `${eventCtx.title} - grote-zaal`
        );
        await expect(page.getByRole('link')).toContainText(
            `${eventCtx.startTime} - ${eventCtx.endTime}`
        );
    });

    test('Admin calendar view shows event with correct time and room', async ({ admin, page }) => {
        const today = new Date();

        const eventCtx = await createSingleEvent(
            { admin, page },
            {
                title: 'Concert',
                date: today,
                startTime: '12:12',
                endTime: '13:13',
            }
        );

        // Go to plugin calendar view
        await page.getByRole('menuitem', { name: ' wp-soli-event-plugin' }).click();
        await page.getByRole('link', { name: 'Events' }).first().click();
        await page.getByRole('link', { name: 'Calendar View' }).click();

        const calendarEventLink = page.getByRole('link', { name: eventCtx.title });

        await expect(calendarEventLink).toContainText(
            `${eventCtx.startTime} - ${eventCtx.endTime}`
        );
        // still using slug here per your TODO-fix
        await expect(calendarEventLink).toContainText('grote-zaal');
    });


});

/**
 * Delete all posts of a given post type using the REST API.
 *
 * @param {RequestUtils} requestUtils
 * @param {string} postType - The REST base of your CPT (e.g., 'soli_event')
 */
export async function deleteAllPostsOfType(requestUtils, postType = 'posts') {
    // 1. Fetch all posts of that type
    const posts = await requestUtils.rest({
        path: `/wp/v2/${postType}`,
        params: {
            per_page: 100,
            status: 'publish,future,draft,pending,private,trash',
            event_filter: 'all',
        },
    });

    console.log(`Found ${posts.length} posts of type ${postType} to delete.`);

    // 2. Delete each one
    await Promise.all(
        posts.map((post) =>
            requestUtils.rest({
                method: 'DELETE',
                path: `/wp/v2/${postType}/${post.id}`,
                params: { force: true },
            })
        )
    );
}

//
// /**
//  * Delete all posts of a given post type using the WP REST API.
//  *
//  * @param {RequestUtils} requestUtils - Your authenticated REST helper (e.g., apiFetch wrapper).
//  * @param {string} postTypeHint - Either the post type slug OR its rest_base (e.g., 'post', 'page', 'soli_event').
//  */
// export async function deleteAllPostsOfType(requestUtils, postTypeHint = 'posts') {
//     // 0) Resolve the correct REST base for the given post type hint.
//     //    /wp/v2/types returns an object keyed by slug; each item has a `rest_base`.
//     const types = await requestUtils.rest({
//         path: '/wp/v2/types',
//         params: { context: 'edit' }, // requires proper auth to see everything
//     });
//
//     const typeEntry = Object.values(types).find(
//         (t) => t.slug === postTypeHint || t.rest_base === postTypeHint
//     );
//
//     if (!typeEntry) {
//         throw new Error(
//             `Unknown post type or rest_base "${postTypeHint}". ` +
//             `Available: ${Object.values(types).map((t) => `${t.slug} (rest_base: ${t.rest_base})`).join(', ')}`
//         );
//     }
//
//     const restBase = typeEntry.rest_base;
//
//     // 1) Fetch ALL IDs (paginate). Use a comma-separated list for statuses.
//     const statuses = ['publish', 'future', 'draft', 'pending', 'private', 'trash']; // 'auto-draft' & 'inherit' usually won’t list here
//     const statusParam = statuses.join(',');
//
//     const ids = [];
//     let page = 1;
//
//     for (;;) {
//         const batch = await requestUtils.rest({
//             path: `/wp/v2/${restBase}`,
//             params: {
//                 _fields: 'id',
//                 per_page: 100,
//                 page,
//                 status: statusParam,
//                 context: 'edit', // see drafts/private/etc (needs caps)
//                 orderby: 'id',
//                 order: 'asc',
//             },
//         });
//
//         if (!Array.isArray(batch) || batch.length === 0) break;
//
//         ids.push(...batch.map((p) => p.id));
//         if (batch.length < 100) break; // last page
//         page += 1;
//     }
//
//     console.log(`Found ${ids.length} items to delete in "${restBase}".`);
//
//     if (ids.length === 0) return { deleted: 0, failed: [] };
//
//     // 2) Delete each one. Use allSettled so one failure doesn’t stop the rest.
//     const results = await Promise.allSettled(
//         ids.map((id) =>
//             requestUtils.rest({
//                 method: 'DELETE',
//                 path: `/wp/v2/${restBase}/${id}`,
//                 params: { force: true }, // bypass trash if supported
//             })
//         )
//     );
//
//     const failed = results
//         .map((r, i) => ({ r, id: ids[i] }))
//         .filter(({ r }) => r.status === 'rejected')
//         .map(({ id, r }) => ({ id, reason: r.reason?.message || String(r.reason) }));
//
//     console.log(`Deleted ${ids.length - failed.length}, failed ${failed.length}.`, failed);
//
//     return { deleted: ids.length - failed.length, failed };
// }

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

    await page.locator('#editor').waitFor({ state: 'visible' });
    const guide = page.locator('.components-guide');
    const eventBlock = page.getByLabel('Block: Create Event');

    const winner = await Promise.race([
        guide.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'guide'),
        eventBlock.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'title'),
    ]);

    if (winner === 'guide') {
        await page.keyboard.press('Escape');
        await expect(guide).toBeHidden();
        await eventBlock.waitFor({ state: 'visible' });
    }

    // Fill in event details
    await page.getByRole('textbox', { name: 'Add title' }).fill(title);

    const sequentialDigits = format(date, 'ddMMyyyy', { locale: enUS });
    const dateInput = page.getByRole('textbox', { name: 'DD MMMM, YYYY' }).first();
    await dateInput.click();
    await dateInput.press('ArrowLeft');
    await dateInput.pressSequentially(sequentialDigits);
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
    { admin, page }: { admin: any; page: any },
    options: CreateCalendarPageOptions = {}
) {
    const { title = 'Calendar' } = options;

    // Go directly to "Add New Page"
    await admin.visitAdminPage('/post-new.php?post_type=page');

    await page.getByRole('textbox', { name: 'Add title' }).click();
    await page.getByRole('textbox', { name: 'Add title' }).fill(title);

    // Insert calendar block
    await page.getByRole('button', { name: 'Add default block' }).click();
    await page
        .getByRole('document', { name: 'Empty block; start writing or' })
        .pressSequentially('/soli calendar');
    await page.getByRole('option', { name: 'Event View Calendar', exact: false }).click();

    // Insert reservation popup block
    await page.getByRole('button', { name: 'Block Inserter' }).click();
    await page.getByRole('searchbox', { name: 'Search' }).fill('soli event reservation');
    await page
        .getByRole('option', { name: 'Event Reservation Popup', exact: false })
        .click();

    // Publish page
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page
        .getByLabel('Editor publish')
        .getByRole('button', { name: 'Publish', exact: true })
        .click();

    // View page on frontend
    await page
        .getByLabel('Editor publish')
        .getByRole('link', { name: 'View Page' })
        .click();

    // At this point, `page` is the front-end Calendar page.
    return { title };
}