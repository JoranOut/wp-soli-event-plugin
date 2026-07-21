/**
 * Archive (/evenement/) and front-end search (S7/S8, F3).
 * Policy: an event lists publicly only if it has >=1 PUBLIC date. Past-only and
 * non-public-date events must not appear to anonymous visitors.
 *
 * Deterministic because the env sets posts_per_page=100 (see .wp-env-script.sh),
 * so the whole seeded catalogue fits on one page. Assertions are scoped to the
 * "VIZ:" titles, so concurrent UI-created events don't interfere.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { pageFor } from './fixtures/roles';
import { archiveListable, title, type CatalogueKey } from './fixtures/catalogue';

const KEYS = Object.keys(archiveListable) as CatalogueKey[];

async function visibleTitles(page: any): Promise<(key: CatalogueKey) => Promise<boolean>> {
    return async (key: CatalogueKey) => {
        const link = page.getByRole('link', { name: title(key), exact: true });
        return (await link.count()) > 0;
    };
}

test.describe('Archive /evenement/ — needs a PUBLIC date (F3)', () => {
    test('anonymous sees only events with a public date', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'anonymous');
        await page.goto('/evenement/');
        const isVisible = await visibleTitles(page);

        for (const key of KEYS) {
            expect(
                await isVisible(key),
                `${title(key)} archive visibility should be ${archiveListable[key]}`
            ).toBe(archiveListable[key]);
        }
        await context.close();
    });
});

test.describe('Front-end search ?s=VIZ — needs a PUBLIC date (F3/S8)', () => {
    test('anonymous search results only include events with a public date', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'anonymous');
        await page.goto('/?s=VIZ%3A');
        const isVisible = await visibleTitles(page);

        for (const key of KEYS) {
            expect(
                await isVisible(key),
                `${title(key)} search visibility should be ${archiveListable[key]}`
            ).toBe(archiveListable[key]);
        }
        await context.close();
    });
});
