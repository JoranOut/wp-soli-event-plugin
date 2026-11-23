/**
 * Room reservation block — visitor flow.
 *
 * The block renders inline. A visitor picks a day, a time and rooms, sees the
 * building's occupancy for that day, and gets a mailto link with the request.
 * Recipient, subject, e-mail text and the note placeholder are block attributes.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';
import { createPageWithBlocks, uniqueTitle, BLOCK_LOAD_TIMEOUT } from './helpers';
import { pageFor } from './fixtures/roles';

const RECIPIENT = 'reserveringen@soli.nl';

function isoDay(offset: number) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function openAsVisitor(browser: any, permalink: string) {
    const { context, page } = await pageFor(browser, 'anonymous');
    await page.goto(permalink);
    const tool = page.locator('.soli-reserve');
    await expect(tool).toBeVisible({ timeout: BLOCK_LOAD_TIMEOUT });
    return { context, page, tool };
}

const mailtoOf = async (page: Page) =>
    decodeURIComponent((await page.locator('a.soli-reserve-button').getAttribute('href')) ?? '');

test.describe('Room reservation block', () => {
    test('anonymous visitor builds a reservation e-mail to the configured recipient', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        await createPageWithBlocks(
            { admin, page, editor },
            [{ name: 'soli/event-reservation-popup', attributes: { recipient: RECIPIENT } }],
            uniqueTitle('Reservation Flow')
        );
        const { context, page: anon, tool } = await openAsVisitor(browser, page.url());

        await expect(anon.locator('.block-event-reservation-popup')).toHaveAttribute('data-recipient', RECIPIENT);

        // Nothing chosen yet: the e-mail action is a disabled button, not a link.
        await expect(tool.getByRole('button', { name: 'Open in e-mail' })).toBeDisabled();
        await expect(tool.locator('.soli-reserve-todo')).toContainText('choose a date');

        await tool.getByLabel('Day', { exact: true }).fill(isoDay(7));
        await tool.getByLabel('From').fill('19:00');
        await tool.getByLabel('Until').fill('21:30');
        // Room names are data and stay Dutch.
        await tool.getByRole('button', { name: /^Grote zaal/ }).click();
        await expect(tool.getByRole('button', { name: /^Grote zaal/ })).toHaveAttribute('aria-pressed', 'true');
        await tool.getByLabel('Your name').fill('Koor De Lijsterbes');

        const href = await mailtoOf(anon);
        expect(href.startsWith(`mailto:${RECIPIENT}?`)).toBeTruthy();
        expect(href).toContain('subject=Room reservation Soli Muziekcentrum');
        expect(href).toContain('Dear Muziekvereniging Soli');
        expect(href).toContain('♫ Grote zaal');
        expect(href).toContain('19:00 – 21:30');
        expect(href).toContain('Koor De Lijsterbes');

        // A second request on the next day carries the same times and rooms.
        await tool.getByRole('button', { name: 'Same times, next day' }).click();
        await expect(tool.locator('.soli-reserve-card')).toHaveCount(2);
        expect((await mailtoOf(anon)).match(/♫ Grote zaal/g)).toHaveLength(2);

        await context.close();
    });

    test('the day strip shows occupancy and warns about an overlap', async ({ admin, page, editor, browser }) => {
        await createPageWithBlocks(
            { admin, page, editor },
            ['soli/event-reservation-popup'],
            uniqueTitle('Reservation Overlap')
        );
        const permalink = page.url();
        const day = isoDay(3);

        const { context, page: anon, tool } = await openAsVisitor(browser, permalink);
        // Stub the occupancy feed so the overlap does not depend on seeded data.
        await anon.route(/soli_event(%2F|\/)v1(%2F|\/)events/, (route) =>
            route.fulfill({
                json: [{
                    id: 1,
                    start_date: `${day} 19:30:00`,
                    end_date: `${day} 22:00:00`,
                    rooms: '["grote-zaal"]',
                    status: 'PUBLIC',
                }],
            })
        );

        await tool.getByLabel('Day', { exact: true }).fill(day);
        await expect(tool.getByRole('button', { name: /^Grote zaal/ })).toContainText('in use 19:30–22:00');
        await expect(tool.getByRole('button', { name: /^Studio 1/ })).toContainText('free all day');

        await tool.getByRole('button', { name: /^Grote zaal/ }).click();
        const warning = tool.locator('.soli-reserve-message.is-warning');
        await expect(warning).toContainText('Something is already planned at this time');
        await expect(warning).toContainText('Grote zaal: 19:30 – 22:00');

        // An overlap is a warning, not a blocker.
        await expect(anon.locator('a.soli-reserve-button')).toBeVisible();

        await context.close();
    });

    test('subject, e-mail text and placeholder follow the block settings', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        await createPageWithBlocks(
            { admin, page, editor },
            [{
                name: 'soli/event-reservation-popup',
                attributes: {
                    recipient: RECIPIENT,
                    subject: 'Zaalhuur aanvraag',
                    template: 'Beste beheerder,\n\n{reservations}\n\n{note}\n\nGroet,\n{name}',
                    notePlaceholder: 'Bijvoorbeeld: repetitie',
                },
            }],
            uniqueTitle('Reservation Custom Texts')
        );
        const { context, page: anon, tool } = await openAsVisitor(browser, page.url());

        await expect(tool.locator('textarea')).toHaveAttribute('placeholder', 'Bijvoorbeeld: repetitie');

        await tool.getByLabel('Day', { exact: true }).fill(isoDay(5));
        await tool.getByRole('button', { name: /^Spiegelzaal/ }).click();
        await tool.getByLabel('Your name').fill('Koor X');

        const letter = tool.getByTestId('reservation-letter');
        // An empty {note} drops its line instead of leaving a gap.
        await expect(letter).toHaveText(/^Beste beheerder,\n\n♫ Spiegelzaal\n.+\n\nGroet,\nKoor X$/);

        await tool.locator('textarea').fill('Repetitie, 30 man');
        await expect(letter).toContainText('Repetitie, 30 man');

        const href = await mailtoOf(anon);
        expect(href).toContain('subject=Zaalhuur aanvraag');
        expect(href).toContain('Beste beheerder');

        await context.close();
    });

    test('without a configured recipient the mailto has no addressee', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        await createPageWithBlocks(
            { admin, page, editor },
            ['soli/event-reservation-popup'],
            uniqueTitle('Reservation No Recipient')
        );
        const { context, page: anon, tool } = await openAsVisitor(browser, page.url());

        await expect(anon.locator('.block-event-reservation-popup')).toHaveAttribute('data-recipient', '');
        await expect(tool.locator('.soli-reserve-letter__meta')).toContainText('your mail program asks for the address');

        await tool.getByLabel('Day', { exact: true }).fill(isoDay(2));
        await tool.getByRole('button', { name: 'Whole building' }).click();

        const href = await mailtoOf(anon);
        expect(href.startsWith('mailto:?subject=')).toBeTruthy();
        expect(href).toContain('♫ Whole building');

        await context.close();
    });
});

const ROOM_INDEX = { 'grote-zaal': 0, spiegelzaal: 1, garderobe: 2, 'studio-1': 3, 'studio-2': 4 } as const;
type Room = keyof typeof ROOM_INDEX;

async function createReservationPage(requestUtils: any, title: string, attributes: Record<string, any> = {}) {
    const page = await requestUtils.rest({
        method: 'POST',
        path: '/wp/v2/pages',
        data: {
            title,
            status: 'publish',
            content: `<!-- wp:soli/event-reservation-popup ${JSON.stringify(attributes)} /-->`,
        },
    });
    return page;
}

async function createEvent(
    requestUtils: any,
    title: string,
    dates: { day: string; from: string; until: string; room: Room; status: string }[],
    hideInCalendar = false
) {
    return requestUtils.rest({
        method: 'POST',
        path: '/wp/v2/soli_event',
        data: {
            title,
            status: 'publish',
            meta: {
                soli_event_hide_in_calendar: hideInCalendar,
                soli_event_dates: JSON.stringify(dates.map((d) => ({
                    start_date: `${d.day} ${d.from}:00`,
                    end_date: `${d.day} ${d.until}:00`,
                    rooms: `[${ROOM_INDEX[d.room]}]`,
                    status: d.status,
                    is_concert: false,
                    notes: '',
                }))),
            },
        },
    });
}

const roomButton = (tool: any, name: string) => tool.getByRole('button', { name: new RegExp(`^${name}`) });

test.describe('Room reservation block — which events occupy a room', () => {
    // A day far enough ahead that no other spec books rooms on it.
    const day = isoDay(200 + Math.floor(Math.random() * 300));
    const title = uniqueTitle('Reservation visibility');
    const hiddenTitle = uniqueTitle('Reservation hidden-in-calendar');
    const created: { type: string; id: number }[] = [];
    let permalink = '';

    test.beforeAll(async ({ requestUtils }) => {
        const event = await createEvent(requestUtils, title, [
            { day, from: '10:00', until: '11:00', room: 'grote-zaal', status: 'PUBLIC' },
            { day, from: '11:00', until: '12:00', room: 'spiegelzaal', status: 'PRIVATE' },
            { day, from: '12:00', until: '13:00', room: 'garderobe', status: 'OPTION' },
            { day, from: '13:00', until: '14:00', room: 'studio-1', status: 'PLANNED' },
            { day, from: '14:00', until: '15:00', room: 'studio-2', status: 'PENDING_APPROVAL' },
            { day, from: '16:00', until: '17:00', room: 'grote-zaal', status: 'CANCELLED' },
        ]);
        created.push({ type: 'soli_event', id: event.id });
        const hidden = await createEvent(requestUtils, hiddenTitle, [
            { day, from: '18:00', until: '19:00', room: 'studio-2', status: 'PUBLIC' },
        ], true);
        created.push({ type: 'soli_event', id: hidden.id });
        const page = await createReservationPage(requestUtils, uniqueTitle('Reservation visibility page'));
        created.push({ type: 'pages', id: page.id });
        permalink = page.link;
    });

    test.afterAll(async ({ requestUtils }) => {
        for (const { type, id } of created) {
            await requestUtils.rest({ method: 'DELETE', path: `/wp/v2/${type}/${id}`, params: { force: true } });
        }
    });

    for (const role of ['anonymous', 'editor'] as const) {
        test(`PUBLIC and PRIVATE dates occupy a room, workflow states and cancellations do not (${role})`, async ({ browser }) => {
            const { context, page } = await pageFor(browser, role);
            await page.goto(permalink);
            const tool = page.locator('.soli-reserve');
            await expect(tool).toBeVisible({ timeout: BLOCK_LOAD_TIMEOUT });
            await tool.getByLabel('Day', { exact: true }).fill(day);

            // PUBLIC counts; the CANCELLED date in the same room does not.
            await expect(roomButton(tool, 'Grote zaal')).toContainText('in use 10:00–11:00');
            await expect(roomButton(tool, 'Grote zaal')).not.toContainText('16:00');
            // PRIVATE counts as in use, like any other booking.
            await expect(roomButton(tool, 'Spiegelzaal')).toContainText('in use 11:00–12:00');
            // OPTION and PLANNED never reach a public feed, so the room reads as free.
            await expect(roomButton(tool, 'Garderobe')).toContainText('free all day');
            await expect(roomButton(tool, 'Studio 1')).toContainText('free all day');
            // PENDING_APPROVAL neither; "hide in calendar" is presentation only and still occupies.
            await expect(roomButton(tool, 'Studio 2')).toContainText('in use 18:00–19:00');
            await expect(roomButton(tool, 'Studio 2')).not.toContainText('14:00');

            // The tool never prints event titles, masked or not.
            await expect(tool).not.toContainText(title);
            await expect(tool).not.toContainText(hiddenTitle);
            await expect(tool).not.toContainText(/private/i);

            // A clash with the PRIVATE booking names the room and time only.
            await tool.getByLabel('From').fill('11:30');
            await tool.getByLabel('Until').fill('12:30');
            await roomButton(tool, 'Spiegelzaal').click();
            await expect(tool.locator('.soli-reserve-message.is-warning')).toContainText('Spiegelzaal: 11:00 – 12:00');
            await expect(tool.locator('.soli-reserve-message.is-warning')).not.toContainText(title);

            await context.close();
        });
    }
});

test.describe('Room reservation block — requests', () => {
    let permalink = '';
    let pageId = 0;

    test.beforeAll(async ({ requestUtils }) => {
        const page = await createReservationPage(requestUtils, uniqueTitle('Reservation requests page'), { recipient: RECIPIENT });
        permalink = page.link;
        pageId = page.id;
    });

    test.afterAll(async ({ requestUtils }) => {
        await requestUtils.rest({ method: 'DELETE', path: `/wp/v2/pages/${pageId}`, params: { force: true } });
    });

    async function open(browser: any) {
        const visitor = await openAsVisitor(browser, permalink);
        // An empty building keeps these tests independent of other specs' events.
        await visitor.page.route(/soli_event(%2F|\/)v1(%2F|\/)events/, (route) => route.fulfill({ status: 204, body: '' }));
        return visitor;
    }

    test('a request over several days shows a strip per day and reads as a range', async ({ browser }) => {
        const { context, page, tool } = await open(browser);
        const first = isoDay(10);
        const last = isoDay(12);

        await tool.getByLabel('Day', { exact: true }).fill(first);
        await tool.getByLabel('Runs past midnight or over several days').check();
        await expect(tool.getByLabel('First day')).toHaveValue(first);
        await tool.getByLabel('Last day').fill(last);
        await tool.getByLabel('From').fill('20:00');
        await tool.getByLabel('Until').fill('02:00');
        await roomButton(tool, 'Grote zaal').first().click();

        await expect(tool.locator('.soli-reserve-strip')).toHaveCount(3);
        // Dragging is single-day only.
        await expect(tool.getByText('Drag along a room to set the time.')).toHaveCount(0);

        const letter = tool.getByTestId('reservation-letter');
        await expect(letter).toContainText(/from .+ 20:00 until .+ 02:00/);
        await expect(page.locator('a.soli-reserve-button')).toBeVisible();

        await context.close();
    });

    test('invalid requests block the e-mail until they are fixed', async ({ browser }) => {
        const { context, page, tool } = await open(browser);
        const sendButton = tool.getByRole('button', { name: 'Open in e-mail' });

        await tool.getByLabel('Day', { exact: true }).fill(isoDay(4));
        await roomButton(tool, 'Studio 1').click();
        await tool.getByLabel('From').fill('21:00');
        await tool.getByLabel('Until').fill('20:00');
        await expect(tool.locator('.soli-reserve-message.is-error')).toContainText('the end time is before the start time');
        await expect(tool.locator('.soli-reserve-todo')).toContainText('request 1: the end time is before the start time');
        await expect(sendButton).toBeDisabled();
        await expect(tool.getByRole('button', { name: 'Copy text' })).toBeDisabled();

        await tool.getByLabel('Until').fill('22:00');
        await expect(tool.locator('.soli-reserve-todo')).toHaveCount(0);
        await expect(page.locator('a.soli-reserve-button')).toBeVisible();

        // A date in the past is refused even when typed around the picker's minimum.
        await tool.getByLabel('Day', { exact: true }).fill(isoDay(-2));
        await expect(tool.locator('.soli-reserve-message.is-error')).toContainText('the date has passed');
        await expect(sendButton).toBeDisabled();

        // Deselecting the only room is a problem too.
        await tool.getByLabel('Day', { exact: true }).fill(isoDay(4));
        await roomButton(tool, 'Studio 1').click();
        await expect(tool.locator('.soli-reserve-todo')).toContainText('choose at least one room');
        await expect(sendButton).toBeDisabled();

        await context.close();
    });

    test('requests can be added and removed, and the last one stays', async ({ browser }) => {
        const { context, tool } = await open(browser);
        const cards = tool.locator('.soli-reserve-card');

        await expect(cards).toHaveCount(1);
        await expect(tool.getByRole('button', { name: 'Remove' })).toHaveCount(0);
        // "Same times, next day" needs a day first.
        await expect(tool.getByRole('button', { name: 'Same times, next day' })).toBeDisabled();

        await tool.getByRole('button', { name: 'Add another day or time' }).click();
        await expect(cards).toHaveCount(2);
        // The new request takes focus so keyboard users land in it.
        await expect(cards.nth(1).getByLabel('Day', { exact: true })).toBeFocused();

        await cards.nth(1).getByLabel('Day', { exact: true }).fill(isoDay(8));
        await cards.nth(0).getByRole('button', { name: 'Remove' }).click();
        await expect(cards).toHaveCount(1);
        await expect(cards.nth(0).getByLabel('Day', { exact: true })).toHaveValue(isoDay(8));
        await expect(tool.getByRole('button', { name: 'Remove' })).toHaveCount(0);

        await context.close();
    });

    test('dragging along a room sets the time and selects that room', async ({ browser }) => {
        const { context, tool } = await open(browser);
        await tool.getByLabel('Day', { exact: true }).fill(isoDay(6));

        // With an empty building the strip runs from 07:00 to 24:00.
        const track = tool.locator('.soli-reserve-track').nth(ROOM_INDEX['studio-1']);
        const box = (await track.boundingBox())!;
        const xAt = (hour: number) => box.x + ((hour - 7) / 17) * box.width;
        const y = box.y + box.height / 2;

        await track.page().mouse.move(xAt(10), y);
        await track.page().mouse.down();
        await track.page().mouse.move(xAt(11), y, { steps: 4 });
        await track.page().mouse.move(xAt(12.5), y, { steps: 4 });
        await track.page().mouse.up();

        await expect(tool.getByLabel('From')).toHaveValue('10:00');
        await expect(tool.getByLabel('Until')).toHaveValue('12:30');
        await expect(roomButton(tool, 'Studio 1')).toHaveAttribute('aria-pressed', 'true');

        // A click without dragging moves the slot and keeps its length.
        await track.page().mouse.click(xAt(15), y);
        await expect(tool.getByLabel('From')).toHaveValue('15:00');
        await expect(tool.getByLabel('Until')).toHaveValue('17:30');

        await context.close();
    });

    test('copy text puts the e-mail on the clipboard', async ({ browser }) => {
        const { context, page, tool } = await open(browser);
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await tool.getByLabel('Day', { exact: true }).fill(isoDay(9));
        await roomButton(tool, 'Garderobe').click();
        await tool.getByLabel('Your name').fill('Koor Y');
        await tool.getByRole('button', { name: 'Copy text' }).click();

        await expect(tool.getByRole('button', { name: 'Copied' })).toBeVisible();
        const clipboard = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboard).toBe(await tool.getByTestId('reservation-letter').innerText());
        expect(clipboard).toContain('♫ Garderobe');
        expect(clipboard).toContain('Koor Y');

        await context.close();
    });

    test('on a phone the panels stack and nothing overflows', async ({ browser }) => {
        const { context, page, tool } = await open(browser);
        await page.setViewportSize({ width: 390, height: 844 });
        await tool.getByLabel('Day', { exact: true }).fill(isoDay(3));

        const requests = (await tool.locator('.soli-reserve__requests').boundingBox())!;
        const summary = (await tool.locator('.soli-reserve__summary').boundingBox())!;
        expect(summary.y).toBeGreaterThanOrEqual(requests.y + requests.height);

        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        // Room names fit their buttons without being cut off.
        const clipped = await tool.locator('.soli-reserve-room__name').evaluateAll(
            (names) => names.filter((n) => n.scrollWidth > n.clientWidth).map((n) => n.textContent)
        );
        expect(clipped).toEqual([]);

        await context.close();
    });

    test('on a wide container the request and the e-mail sit side by side', async ({ browser }) => {
        const { context, page, tool } = await open(browser);
        await page.setViewportSize({ width: 1440, height: 900 });
        // The test theme's content column is narrow; widen the block's container the way a full-width group would.
        await page.locator('.block-event-reservation-popup').evaluate((el: HTMLElement) => {
            el.style.width = '1200px';
            el.style.maxWidth = 'none';
        });

        const requests = (await tool.locator('.soli-reserve__requests').boundingBox())!;
        const summary = (await tool.locator('.soli-reserve__summary').boundingBox())!;
        expect(summary.x).toBeGreaterThan(requests.x + requests.width - 1);
        expect(Math.abs(summary.y - requests.y)).toBeLessThan(2);

        await context.close();
    });
});

test.describe('Room reservation block — editor', () => {
    test('the sidebar settings reach the front end', async ({ admin, page, editor, browser }) => {
        await admin.createNewPost({ postType: 'page', title: uniqueTitle('Reservation sidebar') });
        await editor.insertBlock({ name: 'soli/event-reservation-popup' });
        await editor.openDocumentSettingsSidebar();

        const sidebar = page.getByRole('region', { name: 'Editor settings' });
        await sidebar.getByLabel('Recipient e-mail address').fill(RECIPIENT);
        await sidebar.getByLabel('Subject').fill('Aanvraag via de site');
        await sidebar.getByRole('button', { name: 'Start from the standard text' }).click();
        const template = sidebar.getByLabel('E-mail text');
        await expect(template).toHaveValue(/\{reservations\}[\s\S]*\{note\}[\s\S]*\{name\}/);
        await template.fill('Hallo,\n\n{reservations}\n\n{name}');
        await sidebar.getByLabel('Placeholder for "What is it for?"').fill('Bijvoorbeeld: bandrepetitie');

        await editor.publishPost();
        const permalink = await page.evaluate(() => (window as any).wp.data.select('core/editor').getPermalink());

        const { context, page: anon, tool } = await openAsVisitor(browser, permalink);
        await expect(tool.locator('textarea')).toHaveAttribute('placeholder', 'Bijvoorbeeld: bandrepetitie');
        await tool.getByLabel('Day', { exact: true }).fill(isoDay(5));
        await roomButton(tool, 'Studio 2').click();
        await expect(tool.getByTestId('reservation-letter')).toHaveText(/^Hallo,\n\n♫ Studio 2\n.+\n\n\[Your name\]$/);
        const href = await mailtoOf(anon);
        expect(href.startsWith(`mailto:${RECIPIENT}?subject=Aanvraag via de site&`)).toBeTruthy();

        await context.close();
    });
});
