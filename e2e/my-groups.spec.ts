/**
 * my-groups block — the "Mijn orkesten" panel driven by the SSO assignments.
 *
 * Seeded fixtures (seed.php §3c + §4):
 *   viz-mg-a (onderdeel 9001): mg-a-planned (PLANNED, +1d) + mg-a-public (PUBLIC, +3d)
 *   viz-mg-b (onderdeel 9002): mg-b-planned (PLANNED, +2d) only
 *   viz_subscriber carries soli_oidc_assignments for 9001 + 9002;
 *   viz_editor has no assignments (exercises the editor-only empty note).
 *
 * Locks: assignments→category resolution via term meta, per-group "next date"
 * skipping workflow states (PLANNED +1d must lose to PUBLIC +3d), the
 * no-upcoming-events label, rows linking to the next event itself, and that
 * anonymous visitors and plain members without assignments never see the
 * panel on the front end.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { pageFor } from './fixtures/roles';

// Build a page holding a my-groups block; return its permalink so any role can
// view the server-rendered output.
async function makePage(
    admin: any,
    page: any,
    editor: any,
    attributes: Record<string, unknown> = {}
): Promise<string> {
    await admin.createNewPost({ postType: 'page', title: `MG ${Math.random().toString(36).slice(2, 8)}` });
    await editor.insertBlock({ name: 'soli/my-groups', attributes });
    await editor.publishPost();
    return page.evaluate(() => (window as any).wp.data.select('core/editor').getPermalink());
}

test.describe('my-groups — SSO group panel', () => {
    test('member sees their groups with the next PUBLIC date; workflow dates are skipped', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        const url = await makePage(admin, page, editor);
        const { context, page: view } = await pageFor(browser, 'subscriber');
        await view.goto(url);

        const rows = view.locator('.soli-my-groups .soli-my-groups__list li');
        await expect(rows).toHaveCount(2);

        // Sorted soonest-first, groups without an upcoming event last: A then B.
        await expect(rows.nth(0).locator('.soli-ork-name')).toHaveText('VIZ Mijn Groep A');
        await expect(rows.nth(1).locator('.soli-ork-name')).toHaveText('VIZ Mijn Groep B');

        // Group A's next date is the PUBLIC +3d one, not the PLANNED +1d one.
        // The seeder derives its dates from current_time() and the block renders
        // them in the site timezone (Europe/Amsterdam, set in .wp-env-script.sh),
        // so the expected day number has to be computed in that timezone too:
        // taking it from UTC made this assertion fail every day between 22:00
        // and 24:00 UTC, when the two calendars disagree about the date.
        const expectedDay = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Amsterdam',
            day: 'numeric',
        }).format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
        const metaA = rows.nth(0).locator('.soli-ork-meet');
        await expect(metaA).toContainText(` ${expectedDay} `);
        await expect(metaA).toContainText('·');

        // Group B only has a PLANNED date, which must not surface.
        await expect(rows.nth(1).locator('.soli-ork-meet')).toHaveText('no upcoming events');

        // A row links to its next event's single page; a group without an
        // upcoming event stays unlinked.
        await expect(rows.nth(0).locator('a')).toHaveAttribute('href', /viz-mg-a-public/);
        await expect(rows.nth(1).locator('a')).toHaveCount(0);

        await context.close();
    });

    test('anonymous visitors get nothing', async ({ admin, page, editor, browser }) => {
        const url = await makePage(admin, page, editor);
        const { context, page: view } = await pageFor(browser, 'anonymous');
        await view.goto(url);

        await expect(view.locator('.soli-my-groups')).toHaveCount(0);

        await context.close();
    });

    test('logged-in user without assignments: explanatory note for editors only', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        const url = await makePage(admin, page, editor);

        // viz_editor can edit posts but has no assignments -> sees the note.
        const { context: edCtx, page: edView } = await pageFor(browser, 'editor');
        await edView.goto(url);
        await expect(edView.locator('.soli-my-groups--empty')).toBeVisible();
        await expect(edView.locator('.soli-my-groups__list')).toHaveCount(0);
        await edCtx.close();
    });
});
