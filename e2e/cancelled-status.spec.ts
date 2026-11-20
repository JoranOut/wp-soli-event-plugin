/**
 * CANCELLED date status: editors can set it in the create-event block and it
 * survives a reload; public visibility is covered by the seeded matrix.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { createSingleEvent, editorCanvas, uniqueTitle, BLOCK_LOAD_TIMEOUT } from './helpers';

test('an editor can cancel a date and the status is kept after a reload', async ({ admin, page }) => {
    const title = uniqueTitle('Cancelled rehearsal');
    await createSingleEvent({ admin, page }, { title, status: 'CANCELLED' });

    await page.reload();
    const canvas = await editorCanvas(page);
    const selector = canvas.locator('.event-status-selector').getByRole('combobox');
    await selector.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
    await expect(selector).toHaveText('CANCELLED');
});
