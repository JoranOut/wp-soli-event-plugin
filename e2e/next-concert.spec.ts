/**
 * next-concert block (S4) — the onlyConcerts toggle + category filter (the
 * controls added in this branch) and PRIVATE masking.
 *
 * Determinism comes from dedicated seeded categories (viz-nc, viz-nc-priv) that
 * no other test touches, so "next concert in this category" is stable:
 *   viz-nc:      nc-early   (PUBLIC, +2d, NOT a concert)
 *                nc-concert (PUBLIC, +5d, is a concert)
 *   viz-nc-priv: nc-private (PRIVATE, +2d, is a concert)
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor, pageFor } from './fixtures/roles';
import { SEED_PREFIX, type Role } from './fixtures/catalogue';

// nc-* events are category-isolated fixtures (not part of the standard matrices),
// so title them directly rather than through the typed CatalogueKey helper.
const title = (key: string) => `${SEED_PREFIX}${key}`;

let catNc = 0;
let catPriv = 0;

test.beforeAll(async () => {
    const api = await apiFor('anonymous');
    catNc = (await (await api.get('/wp-json/wp/v2/categories?slug=viz-nc')).json())[0]?.id;
    catPriv = (await (await api.get('/wp-json/wp/v2/categories?slug=viz-nc-priv')).json())[0]?.id;
    await api.dispose();
    expect(catNc, 'viz-nc category id').toBeTruthy();
    expect(catPriv, 'viz-nc-priv category id').toBeTruthy();
});

// Build a page holding a next-concert block with the given attributes; return
// its permalink so any role can view the server-rendered output.
async function makePage(
    admin: any,
    page: any,
    editor: any,
    attributes: Record<string, unknown>
): Promise<string> {
    await admin.createNewPost({ postType: 'page', title: `NC ${Math.random().toString(36).slice(2, 8)}` });
    await editor.insertBlock({ name: 'soli/next-concert', attributes });
    await editor.publishPost();
    return page.evaluate(() => (window as any).wp.data.select('core/editor').getPermalink());
}

test.describe('next-concert — onlyConcerts + category filter (S4)', () => {
    test('onlyConcerts=true skips the earlier non-concert and shows the concert', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        const url = await makePage(admin, page, editor, { onlyConcerts: true, categoryId: catNc });
        const { context, page: view } = await pageFor(browser, 'anonymous');
        await view.goto(url);
        const heading = view.locator('.soli-next-concert__title');
        await expect(heading).toContainText(title('nc-concert'));
        await expect(heading).not.toContainText(title('nc-early'));
        await context.close();
    });

    test('onlyConcerts=false shows the earlier non-concert event', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        const url = await makePage(admin, page, editor, { onlyConcerts: false, categoryId: catNc });
        const { context, page: view } = await pageFor(browser, 'anonymous');
        await view.goto(url);
        await expect(view.locator('.soli-next-concert__title')).toContainText(title('nc-early'));
        await context.close();
    });
});

test.describe('next-concert — PRIVATE masking (S4/F7)', () => {
    test('anonymous sees the private concert masked; logged-in sees the real title', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        const url = await makePage(admin, page, editor, { onlyConcerts: true, categoryId: catPriv });

        // Anonymous: title masked to "private", real title hidden.
        {
            const { context, page: view } = await pageFor(browser, 'anonymous');
            await view.goto(url);
            const heading = view.locator('.soli-next-concert__title');
            await expect(heading).toContainText('private');
            await expect(heading).not.toContainText(title('nc-private'));
            await context.close();
        }
        // Logged-in subscriber: real title shown.
        {
            const { context, page: view } = await pageFor(browser, 'subscriber' as Role);
            await view.goto(url);
            await expect(view.locator('.soli-next-concert__title')).toContainText(title('nc-private'));
            await context.close();
        }
    });
});
