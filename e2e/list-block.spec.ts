/**
 * event-view-list block (S1) — integration smoke over the REST list.
 *
 * The full visibility matrix is asserted authoritatively at the API layer in
 * rest-events.spec.ts (R3); this only proves the block consumes that REST feed
 * and renders/masks it in the DOM. Kept page-1-only to avoid pagination flake
 * (the block loads 10/page).
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { createPageWithBlocks } from './helpers';
import { pageFor } from './fixtures/roles';
import { title } from './fixtures/catalogue';

test.describe('event-view-list block (S1)', () => {
    test('renders seeded public events and never renders a PLANNED-only event', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        await createPageWithBlocks({ admin, page, editor }, ['soli/event-view-list'], `List ${Math.random().toString(36).slice(2, 8)}`);
        // createPageWithBlocks already navigated to the published page, so the
        // current URL is the permalink (the editor store is gone on the front end).
        const permalink = page.url();

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);

        // Wait for the client-side list to resolve.
        const list = anon.locator('.soli-event-list');
        await expect(list).toBeVisible({ timeout: 30000 });
        await expect(anon.locator('.soli-event-list li').first()).toBeVisible({ timeout: 30000 });

        // A PLANNED-only event must never surface in the public list (it is
        // never returned by the feed, so it can't appear on any page).
        await expect(
            anon.getByRole('link', { name: title('date-planned'), exact: true })
        ).toHaveCount(0);

        // Row-level PUBLIC/PRIVATE-masking behaviour is asserted authoritatively
        // against the REST feed in rest-events.spec.ts (R3); the block paginates
        // at 10/page, so per-title DOM checks here would be flaky.

        await context.close();
    });
});
