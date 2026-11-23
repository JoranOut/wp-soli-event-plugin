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
