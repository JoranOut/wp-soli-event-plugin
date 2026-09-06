/**
 * Admin plugin pages capability gating (A2/A3/A4).
 *
 * Log View and Settings are administrative surfaces and stay on
 * `manage_options`. Calendar View is a read-only view of events the viewer can
 * already reach, so it is gated on `edit_posts` instead: the people who manage
 * events - authors and editors - need the calendar, and subscribers do not.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { pageFor } from './fixtures/roles';
import { type Role } from './fixtures/catalogue';

const CALENDAR_VIEW = '/wp-admin/edit.php?post_type=soli_event&page=soli_event_admin_view';

const ADMIN_ONLY_PAGES = {
    'Log View (A3)': '/wp-admin/edit.php?post_type=soli_event&page=soli_event_admin_log',
    'Settings (A4)': '/wp-admin/options-general.php?page=soli_event_settings',
};

const denied = /not allowed to access this page|Sorry, you are not allowed/i;

async function expectAccess(browser: any, role: any, url: string, allowed: boolean) {
    const { context, page } = await pageFor(browser, role);
    await page.goto(url);
    if (allowed) {
        await expect(page.getByText(denied)).toHaveCount(0);
    } else {
        await expect(page.getByText(denied)).toBeVisible();
    }
    await context.close();
}

test.describe('Admin plugin pages — manage_options gating', () => {
    for (const [label, url] of Object.entries(ADMIN_ONLY_PAGES)) {
        test(`${label}: admin allowed, editor denied`, async ({ browser }) => {
            await expectAccess(browser, 'admin', url, true);
            await expectAccess(browser, 'editor' as Role, url, false);
        });
    }
});

test.describe('Calendar View (A2) — edit_posts gating', () => {
    // The author is the case this gate exists for: an author manages events but
    // has none of the administrative capabilities.
    test('author may open it', async ({ browser }) => {
        await expectAccess(browser, 'author', CALENDAR_VIEW, true);
    });

    test('editor and admin may open it', async ({ browser }) => {
        await expectAccess(browser, 'editor' as Role, CALENDAR_VIEW, true);
        await expectAccess(browser, 'admin', CALENDAR_VIEW, true);
    });

    test('subscriber is denied', async ({ browser }) => {
        await expectAccess(browser, 'subscriber' as Role, CALENDAR_VIEW, false);
    });
});
