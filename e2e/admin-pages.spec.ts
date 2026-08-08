/**
 * Admin plugin pages capability gating (A2/A3/A4). All require manage_options,
 * so only admins may open them; editors/subscribers are denied.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { pageFor } from './fixtures/roles';
import { type Role } from './fixtures/catalogue';

const PAGES = {
    'Calendar View (A2)': '/wp-admin/edit.php?post_type=soli_event&page=soli_event_admin_view',
    'Log View (A3)': '/wp-admin/edit.php?post_type=soli_event&page=soli_event_admin_log',
    'Settings (A4)': '/wp-admin/options-general.php?page=soli_event_settings',
};

const denied = /not allowed to access this page|Sorry, you are not allowed/i;

test.describe('Admin plugin pages — manage_options gating', () => {
    for (const [label, url] of Object.entries(PAGES)) {
        test(`${label}: admin allowed, editor denied`, async ({ browser }) => {
            // Admin: reaches the page (no "denied" message).
            {
                const { context, page } = await pageFor(browser, 'admin');
                await page.goto(url);
                await expect(page.getByText(denied)).toHaveCount(0);
                await context.close();
            }
            // Editor: lacks manage_options -> denied.
            {
                const { context, page } = await pageFor(browser, 'editor' as Role);
                await page.goto(url);
                await expect(page.getByText(denied)).toBeVisible();
                await context.close();
            }
        });
    }
});
