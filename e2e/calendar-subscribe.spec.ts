/**
 * calendar-subscribe block. An interactive promo widget: the visitor picks
 * "All concerts" and/or orchestras/groups (categories used by published
 * events) from one searchable multi-select dropdown, and the block builds a
 * live /ical subscribe URL (display + webcal + download). The editor sets
 * which options are pre-ticked on load.
 *
 * The /ical query semantics themselves (concerts / category / OR) are locked
 * authoritatively in ical-feed.spec.ts; this proves the block emits the right
 * URL and keeps it in sync with the selection.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { pageFor } from './fixtures/roles';

async function createSubscribePage(
    { admin, page, editor }: { admin: any; page: any; editor: any },
    attributes: Record<string, unknown>
): Promise<string> {
    await admin.createNewPost({ postType: 'page', title: `Subscribe ${Math.random().toString(36).slice(2, 8)}` });
    await editor.insertBlock({ name: 'soli/calendar-subscribe', attributes });
    await editor.publishPost();
    const permalink = await page.evaluate(() =>
        window.wp.data.select('core/editor').getPermalink()
    );
    return permalink;
}

test.describe('calendar-subscribe block', () => {
    test('renders the editor default selection as the initial URL', async ({ admin, page, editor, browser }) => {
        const permalink = await createSubscribePage(
            { admin, page, editor },
            { defaultConcerts: true, defaultCategories: ['viz-nc'] }
        );

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);

        const widget = anon.locator('.soli-cal-subscribe');
        await expect(widget).toBeVisible();

        const url = widget.locator('.soli-cal-subscribe__url');
        await expect(url).toContainText('categorie=viz-nc');
        await expect(url).toContainText('concerten=1');

        // Both defaults show as chips in the dropdown control.
        await expect(widget.locator('.soli-cal-subscribe__chip[data-kind="concerts"]')).toContainText('All concerts');
        await expect(widget.locator('.soli-cal-subscribe__chip[data-value="viz-nc"]')).toContainText('VIZ Next-Concert');

        // The how-to explanation is present but collapsed.
        const help = widget.locator('.soli-cal-subscribe__help');
        await expect(help.locator('summary')).toBeVisible();
        await expect(help).not.toHaveAttribute('open');

        await context.close();
    });

    test('updates the URL, webcal and download links as the selection changes', async ({ admin, page, editor, browser }) => {
        const permalink = await createSubscribePage(
            { admin, page, editor },
            { defaultConcerts: false, defaultCategories: [] }
        );

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);

        const widget = anon.locator('.soli-cal-subscribe');
        const url = widget.locator('.soli-cal-subscribe__url');
        const add = widget.locator('.soli-cal-subscribe__add');
        const download = widget.locator('.soli-cal-subscribe__download');

        // Nothing ticked -> the bare feed (whole public agenda).
        await expect(url).not.toContainText('?');
        await expect(widget.locator('.soli-cal-subscribe__placeholder')).toBeVisible();

        // Open the dropdown and tick "All concerts" (first option in the list).
        await widget.locator('.soli-cal-subscribe__control').click();
        await widget.locator('.soli-cal-subscribe__opt[data-kind="concerts"]').check();
        await expect(url).toContainText('concerten=1');
        await expect(add).toHaveAttribute('href', /^webcal:\/\/.*concerten=1/);
        await expect(download).toHaveAttribute('href', /concerten=1/);
        await expect(widget.locator('.soli-cal-subscribe__chip[data-kind="concerts"]')).toBeVisible();

        // Add a category -> OR-combined in the query.
        await widget.locator('.soli-cal-subscribe__opt[data-kind="category"][value="viz-nc2"]').check();
        await expect(url).toContainText('categorie=viz-nc2');
        await expect(url).toContainText('concerten=1');
        await expect(widget.locator('.soli-cal-subscribe__chip[data-value="viz-nc2"]')).toBeVisible();

        // Untick concerts -> only the category remains.
        await widget.locator('.soli-cal-subscribe__opt[data-kind="concerts"]').uncheck();
        await expect(url).toContainText('categorie=viz-nc2');
        await expect(url).not.toContainText('concerten=1');
        await expect(widget.locator('.soli-cal-subscribe__chip[data-kind="concerts"]')).toHaveCount(0);

        await context.close();
    });

    test('category dropdown is searchable and chips remove selections', async ({ admin, page, editor, browser }) => {
        const permalink = await createSubscribePage(
            { admin, page, editor },
            { defaultConcerts: false, defaultCategories: [] }
        );

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);

        const widget = anon.locator('.soli-cal-subscribe');
        const url = widget.locator('.soli-cal-subscribe__url');
        const panel = widget.locator('.soli-cal-subscribe__panel');
        const options = panel.locator('.soli-cal-subscribe__option:visible');

        // Panel is closed until the control is clicked.
        await expect(panel).toBeHidden();
        await widget.locator('.soli-cal-subscribe__control').click();
        await expect(panel).toBeVisible();

        // Searching narrows the list to matching categories only.
        const search = widget.locator('.soli-cal-subscribe__search');
        await search.fill('Next-Concert Two');
        await expect(options).toHaveCount(1);
        await options.first().locator('input').check();
        await expect(url).toContainText('categorie=viz-nc2');

        // A nonsense query shows the empty state.
        await search.fill('zzz-no-such-category');
        await expect(options).toHaveCount(0);
        await expect(widget.locator('.soli-cal-subscribe__no-match')).toBeVisible();

        // Clicking outside closes the panel; the chip stays.
        await anon.locator('body').click({ position: { x: 5, y: 5 } });
        await expect(panel).toBeHidden();
        const chip = widget.locator('.soli-cal-subscribe__chip[data-value="viz-nc2"]');
        await expect(chip).toBeVisible();

        // Removing the chip unticks the category and updates the URL.
        await chip.locator('.soli-cal-subscribe__chip-remove').click();
        await expect(chip).toHaveCount(0);
        await expect(url).not.toContainText('categorie=');
        await expect(widget.locator('.soli-cal-subscribe__placeholder')).toBeVisible();

        await context.close();
    });
});
