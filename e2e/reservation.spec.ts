/**
 * Reservation popup must not leak the site admin e-mail into the public DOM
 * (F5). The recipient has to be resolved server-side on submit, never printed
 * as a data-attribute an anonymous visitor can read.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { createPageWithBlocks } from './helpers';
import { pageFor } from './fixtures/roles';

test.describe('Reservation popup — no admin e-mail leak (F5)', () => {
    test('data-recipient does not expose an e-mail address to the public', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        const { title } = await createPageWithBlocks(
            { admin, page, editor },
            ['soli/event-reservation-popup'],
            `Reservation Leak Check ${Math.random().toString(36).slice(2, 8)}`
        );
        // createPageWithBlocks already navigated to the published page.
        const permalink = page.url();

        // View as an anonymous visitor — the true public surface.
        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);
        const popup = anon.locator('.block-event-reservation-popup');
        await expect(popup).toBeVisible();

        const recipient = await popup.getAttribute('data-recipient');
        expect(recipient ?? '', `data-recipient leaked "${recipient}"`).not.toMatch(/@/);

        // And the raw HTML must not contain the admin e-mail anywhere.
        const html = await anon.content();
        expect(html).not.toMatch(/[\w.+-]+@[\w.-]+\.\w+/);

        await context.close();
        expect(title).toBeTruthy();
    });
});
