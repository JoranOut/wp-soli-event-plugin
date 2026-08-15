import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { createSingleEvent, createPageWithBlocks, uniqueTitle } from './helpers';

test.describe('Concert Hero Block', () => {
    // Tests share one WordPress instance and run concurrently. The hero always
    // renders the *globally* next concert (soonest future is_concert date), so
    // we cannot assert on a specific event's identity without racing other
    // tests' concerts. Instead each test guarantees at least one PUBLIC concert
    // exists, then asserts on the block's structure and real-data shape - the
    // registration + render_callback + query wiring that could actually regress.
    test.describe.configure({ mode: 'parallel' });

    test('renders the next concert on the frontend', async ({ admin, page, editor }) => {
        // Guarantee a concert exists so the hero is populated (createSingleEvent
        // flips the concert switch and publishes a PUBLIC event).
        await createSingleEvent({ admin, page }, { title: uniqueTitle('Hero Concert') });

        await createPageWithBlocks(
            { admin, page, editor },
            ['soli/concert-hero'],
            uniqueTitle('Concert Hero Page')
        );

        // We are now on the front-end page containing the block.
        const hero = page.locator('.soli-concert-hero');
        await expect(hero).toBeVisible();

        // The hero enforces a minimum height so it stays substantial even with a
        // short title / no excerpt (min-height is 70vh, more when wide).
        const box = await hero.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(400);

        // A concert exists, so the populated hero (not the editor empty state)
        // must render.
        await expect(page.locator('.soli-concert-hero--empty')).toHaveCount(0);
        await expect(page.locator('.soli-concert-hero__card')).toBeVisible();

        // Static chrome. Strings are English source (the test instance runs the
        // en_US locale); the Dutch translations live in soli-event-nl_NL.po.
        await expect(page.locator('.soli-concert-hero__eyebrow')).toHaveText(/Next concert/);
        await expect(page.locator('.soli-concert-hero__card-kicker')).toHaveText(/Concert programme/);

        // A real concert row was joined and formatted: the title is non-empty
        // and the program card shows a real start time ("HH:MM hrs") next to
        // the start label.
        await expect(page.locator('.soli-concert-hero__title')).not.toBeEmpty();
        // The title splits into a two-tone display; the last word is always the
        // accent span, so it is present for any (non-empty) concert title.
        await expect(page.locator('.soli-concert-hero__title-accent')).toBeVisible();
        const card = page.locator('.soli-concert-hero__card');
        await expect(card).toContainText('Start');
        await expect(card).toContainText(/\d{1,2}:\d{2}\s*hrs/);
    });

    test('never shows an Orchestra row for categories outside the orkesten parent', async ({ admin, page, editor }) => {
        // The run env seeds several categories (viz-mg-a, nc1, ...) and assigns
        // them to concert events, but none of them live under an 'orkesten'
        // parent - no such parent even exists here. Whatever concert the hero
        // resolves as "next", those categories are not orchestras, so the card
        // must never grow an Orchestra row.
        await createSingleEvent({ admin, page }, { title: uniqueTitle('Hero No Orchestra') });

        await createPageWithBlocks(
            { admin, page, editor },
            ['soli/concert-hero'],
            uniqueTitle('Concert Hero No Orchestra Page')
        );

        const card = page.locator('.soli-concert-hero__card');
        await expect(card).toBeVisible();
        await expect(card).toContainText('Start');
        await expect(card).not.toContainText('Orchestra');
    });

    test('inserts in the editor without crashing (link picker mounts)', async ({ admin, editor, page }) => {
        await admin.createNewPost({ postType: 'page', title: uniqueTitle('Hero Editor') });
        await editor.insertBlock({ name: 'soli/concert-hero' });

        // The edit component embeds the editor link picker (LinkControl). A bad
        // import or render error would trip the block error boundary; assert the
        // block mounted and no crash warning is shown.
        const blocks = await editor.getBlocks();
        expect(blocks.some((b: any) => b.name === 'soli/concert-hero')).toBe(true);
        await expect(page.locator('.block-editor-warning')).toHaveCount(0);
    });

    test('CTA buttons use the configured defaults', async ({ admin, page, editor }) => {
        await createSingleEvent({ admin, page }, { title: uniqueTitle('Hero Concert') });

        await createPageWithBlocks(
            { admin, page, editor },
            ['soli/concert-hero'],
            uniqueTitle('Concert Hero CTA Page')
        );

        const primary = page.locator('.soli-concert-hero__btn--primary');
        await expect(primary).toBeVisible();
        await expect(primary).toHaveText(/Tickets & agenda/);
        await expect(primary).toHaveAttribute('href', /\/agenda\//);

        const secondary = page.locator('.soli-concert-hero__btn--outline');
        await expect(secondary).toBeVisible();
        await expect(secondary).toHaveText(/Become a member of Soli/);
        await expect(secondary).toHaveAttribute('href', /vereniging/);
    });
});
