/**
 * Admin events list (A1, edit.php?post_type=soli_event).
 *   - Capability: needs edit_posts. Subscribers are denied; editors/admins allowed.
 *   - The Future/All dropdown filters by time (default: future).
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { pageFor } from './fixtures/roles';
import { title } from './fixtures/catalogue';

const LIST = '/wp-admin/edit.php?post_type=soli_event';
const search = (t: string) => `${LIST}&s=${encodeURIComponent(t)}`;

test.describe('Admin events list — capability (A1)', () => {
    test('subscriber is denied', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'subscriber');
        await page.goto(LIST);
        await expect(
            page.getByText(/not allowed to access this page|Sorry, you are not allowed/i)
        ).toBeVisible();
        await context.close();
    });

    test('editor may access the list', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'editor');
        await page.goto(search(title('post-publish')));
        await expect(
            page.locator('tr.type-soli_event').filter({ hasText: title('post-publish') })
        ).toBeVisible();
        await context.close();
    });
});

test.describe('Admin events list — Future/All time filter (A1)', () => {
    // The Future/All dropdown is an admin convenience (admins see every event
    // regardless — no security bearing; the visibility-relevant future filter is
    // covered on the front-end archive, S7). We lock the control's presence and
    // default here. NOTE: the future filter is intentionally bypassed when a
    // search term is active (search spans all dates), so we don't assert rows.
    test('renders the Future/All filter defaulting to Future', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'admin');
        await page.goto(LIST);
        const dropdown = page.locator('select#event_filter');
        await expect(dropdown).toBeVisible();
        await expect(dropdown).toHaveValue('future');
        await expect(dropdown.locator('option')).toHaveCount(2); // Future + All
        await context.close();
    });
});
