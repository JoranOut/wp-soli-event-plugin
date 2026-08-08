/**
 * Reservation popup — full visitor flow.
 *
 * The recipient is a per-block editor setting (a deliberately public
 * reservation address) rendered into data-recipient. An anonymous visitor
 * opens the popup, adds a time slot, picks a room, and gets a mailto link
 * addressed to that recipient with the reservation details in the body.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { createPageWithBlocks, uniqueTitle, BLOCK_LOAD_TIMEOUT } from './helpers';
import { pageFor } from './fixtures/roles';

const RECIPIENT = 'reserveringen@soli.nl';

test.describe('Reservation popup — full flow', () => {
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
        // createPageWithBlocks already navigated to the published page.
        const permalink = page.url();

        // Drive the flow as an anonymous visitor — the true public surface.
        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);

        const popup = anon.locator('.block-event-reservation-popup');
        await expect(popup).toBeVisible({ timeout: BLOCK_LOAD_TIMEOUT });
        await expect(popup).toHaveAttribute('data-recipient', RECIPIENT);

        // Open the popup and add a time slot.
        await anon.getByRole('button', { name: 'Reserve', exact: true }).click();
        const modal = anon.getByRole('dialog', { name: 'Reserve time slot(s)' });
        await expect(modal).toBeVisible();

        // No slots yet: the e-mail button is a disabled button, not a link.
        await expect(modal.locator('.email-button')).toBeDisabled();

        await modal.getByRole('button', { name: 'new' }).click();

        // The new slot shows up as a reservation in the day calendar.
        await expect(modal.locator('.fc-event').getByText('Reservation')).toBeVisible();

        // Pick a room (room names are data and stay Dutch).
        await modal.getByRole('combobox', { name: 'Select rooms' }).click();
        await anon.getByRole('option', { name: 'Grote zaal' }).click();
        // Close the MUI dropdown via its backdrop: while the menu is open MUI
        // marks the wp modal aria-hidden, which hides it from role queries.
        await anon.locator('.MuiBackdrop-root').click({ position: { x: 5, y: 5 } });
        await expect(anon.getByRole('option', { name: 'Grote zaal' })).toBeHidden();

        // The e-mail button becomes a mailto link addressed to the configured
        // recipient, with subject and the reserved room in the body.
        const emailLink = modal.locator('a.email-button');
        await expect(emailLink).toBeVisible();
        const href = (await emailLink.getAttribute('href')) ?? '';
        expect(href.startsWith(`mailto:${RECIPIENT}?`)).toBeTruthy();
        expect(href).toContain(`subject=${encodeURIComponent('Room reservation Soli Muziekcentrum')}`);
        expect(href).toContain(encodeURIComponent('Grote zaal'));
        expect(href).toContain(encodeURIComponent('Dear Muziekvereniging Soli'));

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
        const permalink = page.url();

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);

        const popup = anon.locator('.block-event-reservation-popup');
        await expect(popup).toBeVisible({ timeout: BLOCK_LOAD_TIMEOUT });
        await expect(popup).toHaveAttribute('data-recipient', '');

        await context.close();
    });
});
