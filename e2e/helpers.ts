import { expect, type Page, type FrameLocator } from '@wordpress/e2e-test-utils-playwright';
import { addDays, format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';

// Unique per-test identifier so concurrent tests never collide on shared state.
export function uniqueTitle(base: string) {
    return `${base} ${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Returns a Playwright locator scope for the Gutenberg block editor canvas.
 *
 * WordPress 7.1+ renders the editor canvas inside an iframe
 * (iframe[name="editor-canvas"]). When that iframe is present, selectors for
 * block content must be scoped to the frame; otherwise the top-level page is
 * used. Use this helper for any selector that targets elements rendered inside
 * the block canvas (e.g. .single-event, .date-list-item, .soli-block-*).
 *
 * Do NOT use this for admin-page chrome, toolbar controls, sidebar panels,
 * modals outside the canvas, or frontend pages — those always live on the
 * top-level page.
 */
export async function editorCanvas(page: Page): Promise<Page | FrameLocator> {
    const iframe = page.locator('iframe[name="editor-canvas"]');
    const exists = await iframe.count().then((n) => n > 0).catch(() => false);
    if (exists) {
        return page.frameLocator('iframe[name="editor-canvas"]');
    }
    return page;
}

// The MUI-heavy Create Event block can take several seconds to paint on CI's
// constrained runner (fast locally). Give block-load waits generous headroom.
export const BLOCK_LOAD_TIMEOUT = 30_000;

// The status a new event defaults to (EVENT_STATUS[0] in inc/values.js).
export const DEFAULT_EVENT_STATUS = 'OPTION';

export type CreateEventOptions = {
    title?: string;
    date?: Date;
    startTime?: string;
    endTime?: string;
    locationLabel?: string;
    roomLabel?: string;
    status?: string;
    // When set, create the event with a named external location (via the
    // "Nieuwe locatie" creator) instead of the internal Muziekcentrum rooms.
    namedLocation?: { name: string; address: string };
    // When true, leave the status at the block's default instead of selecting one.
    keepDefaultStatus?: boolean;
};

// Reusable helper to create a single event with default settings.
// Toggling the concert switch (the block's single MUI Switch) flags the date
// as a concert, so events created here are PUBLIC concerts by default.
export async function createSingleEvent(
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
        namedLocation,
        keepDefaultStatus = false,
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
    // generous timeout - the welcome guide is disabled, so its waitFor only
    // rejects at the timeout and must not lose the race before the block paints.
    // Promise.any is used (not Promise.race) so that the guide timing out does
    // not reject the overall wait when the block is still loading.
    const winner = await Promise.any([
        guide.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }).then(() => 'guide'),
        eventBlock.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }).then(() => 'title'),
    ]);

    if (winner === 'guide') {
        await page.keyboard.press('Escape');
        await expect(guide).toBeHidden();
        await eventBlock.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
    }

    // A brand-new event opens the first-event wizard on top of the block (it
    // appears once the block's events fetch resolves). This helper drives the
    // inline editor directly, so dismiss it.
    const wizard = page.locator('.first-event-wizard');
    await wizard.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
    await wizard.getByRole('button', { name: 'Skip' }).click();
    await expect(wizard).toBeHidden();

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

    await page.getByRole('button', { name: 'Choose a location' }).click();
    if (namedLocation) {
        // External location path: create and select a named venue.
        await page.getByRole('button', { name: 'New location' }).click();
        await page.locator('input[name="name"]').fill(namedLocation.name);
        await page.locator('textarea[name="address"]').fill(namedLocation.address);
        await page.getByRole('button', { name: 'Save and select' }).click();
    } else {
        await page.getByRole('checkbox', { name: locationLabel }).check();
        await page
            .locator('label')
            .filter({ hasText: roomLabel })
            .getByTestId('CheckBoxOutlineBlankIcon')
            .click();
        await page.getByRole('button', { name: 'Save', exact: true }).click();
    }

    // Flag as a concert & publish
    await page.locator('.MuiButtonBase-root.MuiSwitch-switchBase').click();
    if (!keepDefaultStatus) {
        await page.getByRole('combobox', { name: 'OPTION' }).click();
        await page.getByRole('option', { name: status }).click();
    }
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
        status: keepDefaultStatus ? DEFAULT_EVENT_STATUS : status,
        namedLocation,
    };
}

// Create a page containing the given blocks and navigate to it on the front end.
// Uses the official editor fixtures (createNewPost + insertBlock + publishPost)
// instead of hand-driving the canvas, which is timing-sensitive on CI.
// Blocks are either a block name or { name, attributes }.
export async function createPageWithBlocks(
    { admin, page, editor }: { admin: any; page: any; editor: any },
    blocks: (string | { name: string; attributes?: Record<string, any> })[],
    title: string
) {
    await admin.createNewPost({ postType: 'page', title });

    for (const block of blocks) {
        await editor.insertBlock(typeof block === 'string' ? { name: block } : block);
    }

    await editor.publishPost();

    // Navigate to the published page on the front end.
    const permalink = await page.evaluate(() =>
        window.wp.data.select('core/editor').getPermalink()
    );
    await page.goto(permalink);

    return { title };
}

type CreateCalendarPageOptions = {
    title?: string;
};

export async function createCalendarPage(
    { admin, page, editor }: { admin: any; page: any; editor: any },
    options: CreateCalendarPageOptions = {}
) {
    const { title = 'Calendar' } = options;
    return createPageWithBlocks(
        { admin, page, editor },
        ['soli/event-view-calendar', 'soli/event-reservation-popup'],
        title
    );
}
