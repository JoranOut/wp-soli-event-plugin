import { expect } from '@wordpress/e2e-test-utils-playwright';
import type { FrameLocator, Locator, Page } from '@playwright/test';
import { addDays, differenceInCalendarMonths, format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';

// Unique per-test identifier so concurrent tests never collide on shared state.
export function uniqueTitle(base: string) {
    return `${base} ${Math.random().toString(36).slice(2, 10)}`;
}

// The MUI-heavy Create Event block can take several seconds to paint on CI's
// constrained runner (fast locally). Give block-load waits generous headroom.
export const BLOCK_LOAD_TIMEOUT = 30_000;

// WordPress renders block content inside the `editor-canvas` iframe from 7.1
// on; 6.9 renders it straight into the admin document. Anything *in* the
// canvas - the blocks, the post title, and (since the blocks pin their MUI
// portal containers to their own document) MUI dropdowns opened from a block -
// must be addressed through this root. Editor chrome stays on `page`: the
// header, the document sidebar, snackbars, and `@wordpress/components` Modals,
// which portal into the parent document on every version.
//
// Whether the editor is iframed is a property of the WordPress version, so it
// is resolved once per worker. Call this only with an editor open, or the first
// call memoises the wrong answer for the whole worker.
let editorIsIframed: boolean | undefined;

export async function editorCanvas(page: Page): Promise<Page | FrameLocator> {
    if (editorIsIframed === undefined) {
        editorIsIframed = await page
            .locator('iframe[name="editor-canvas"]')
            .waitFor({ state: 'attached', timeout: BLOCK_LOAD_TIMEOUT })
            .then(() => true)
            .catch(() => false);
    }

    return editorIsIframed ? page.frameLocator('iframe[name="editor-canvas"]') : page;
}

// Set a MUI date field through its calendar popup rather than by typing into
// the field.
//
// Typing is not an option inside the editor canvas: @mui/x-date-pickers 7.x
// resolves the focused element with `getActiveElement(document)` against the
// *global* document (internals/hooks/useField/useFieldV7TextField.js). From WP
// 7.1 the block renders in the editor-canvas iframe, where the parent
// document's activeElement is the <iframe> itself, so the field concludes it is
// not focused and drops every keystroke. Clicking through the calendar works on
// both versions, and it is the path a real editor has on WP 7.1.
//
// The popup lands in the same document as the field because the blocks pin
// their MUI portal containers there (events/inc/editor-style-scope.js).
export async function pickDate(scope: Page | FrameLocator, field: Locator, date: Date) {
    await field.getByRole('button').first().click();

    const dialog = scope.getByRole('dialog');
    // The calendar opens on the month of the field's current value, which is
    // today for a fresh event. Step by whole months rather than reading the
    // header, whose month names follow the picker's dayjs locale.
    const months = differenceInCalendarMonths(date, new Date());
    const nav = months < 0 ? 'Previous month' : 'Next month';
    for (let i = 0; i < Math.abs(months); i++) {
        await dialog.getByRole('button', { name: nav }).click();
    }

    await dialog
        .getByRole('gridcell', { name: format(date, 'd', { locale: enUS }), exact: true })
        .first()
        .click();
    await expect(dialog).toBeHidden();
}

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
    const canvas = await editorCanvas(page);
    const eventBlock = canvas.getByLabel('Block: Create Event');

    // The Create Event block renders a stack of heavy MUI components
    // (date/time pickers, selectors, editors) synchronously. On CI's
    // constrained runner this paint can take several seconds, so allow a
    // generous timeout - the welcome guide is disabled, so its waitFor only
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

    // A brand-new event opens the first-event wizard on top of the block (it
    // appears once the block's events fetch resolves). This helper drives the
    // inline editor directly, so dismiss it.
    const wizard = page.locator('.first-event-wizard');
    await wizard.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
    await wizard.getByRole('button', { name: 'Skip' }).click();
    await expect(wizard).toBeHidden();

    // Fill in event details
    await canvas.getByRole('textbox', { name: 'Add title' }).fill(title);

    await pickDate(canvas, canvas.locator('div.start-date'), date);

    await canvas.getByRole('textbox', { name: 'hh:mm' }).first().fill(startTime);
    await canvas.getByRole('textbox', { name: 'hh:mm' }).nth(1).fill(endTime);

    await canvas.getByRole('button', { name: 'Choose a location' }).click();
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
    await canvas.locator('.MuiButtonBase-root.MuiSwitch-switchBase').click();
    if (!keepDefaultStatus) {
        await canvas.getByRole('combobox', { name: 'OPTION' }).click();
        await canvas.getByRole('option', { name: status }).click();
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
