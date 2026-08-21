/**
 * E2E: WordPress 7.1 editor-iframe MUI style regression.
 *
 * WordPress 7.1 renders the block editor canvas inside an <iframe>.  Before
 * the IframeAwareMuiProvider fix, Emotion's default cache inserted every MUI
 * <style> tag into the outer wp-admin document's <head>, which is invisible
 * from inside the iframe — MUI components would render completely unstyled.
 *
 * This spec verifies that:
 *   1. The Create Event block (soli/create-event) loads in the editor.
 *   2. MUI-generated <style> tags are present in the same document as the
 *      block canvas, not only in the outer wp-admin document.
 *
 * The check is performed via ownerDocument of an element inside the canvas
 * subtree so it is compatible with both the legacy full-page editor and the
 * WP 7.1 iframe-based editor.
 */

import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { BLOCK_LOAD_TIMEOUT, uniqueTitle } from './helpers';

test.describe('Create Event block — MUI styles in editor canvas document', () => {
    test('Emotion/MUI styles are inserted into the editor canvas document', async ({ admin, page }) => {
        // Open a new soli_event post so the create-event block is present.
        await admin.visitAdminPage('/edit.php?post_type=soli_event');
        await page.getByRole('link', { name: 'Events' }).first().click();
        await page.locator('#wpbody-content').getByRole('link', { name: 'Add New Event' }).click();

        await page.locator('#editor').waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });

        // Dismiss the welcome guide if it appears.
        const guide = page.locator('.components-guide');
        await Promise.any([
            guide.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }).then(async () => {
                await page.keyboard.press('Escape');
                await expect(guide).toBeHidden();
            }),
            page.getByLabel('Block: Create Event').waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }),
        ]);

        // Dismiss first-event wizard if it appears.
        const wizard = page.locator('.first-event-wizard');
        const wizardVisible = await wizard.isVisible().catch(() => false);
        if (wizardVisible) {
            await wizard.getByRole('button', { name: 'Skip' }).click();
            await expect(wizard).toBeHidden();
        }

        // Wait for the Create Event block canvas content to be present.
        const eventBlock = page.getByLabel('Block: Create Event');
        await eventBlock.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });

        // Locate an element rendered inside the canvas subtree.  The
        // .soli-block-create-event wrapper is the outermost canvas element of
        // the block — use it to resolve ownerDocument and check that Emotion
        // style tags are present in that same document's <head>.
        //
        // In WP 7.1+ the canvas is an iframe, so the element's ownerDocument
        // is the iframe document; in older WP it is the main document.  Either
        // way, MUI styles must exist in that document.
        const muiStylesInCanvasDocument = await page.evaluate(() => {
            // Walk every frame (top-level document + all iframes).
            const docs: Document[] = [document];
            for (const frame of Array.from(document.querySelectorAll('iframe'))) {
                try {
                    const fd = frame.contentDocument;
                    if (fd) docs.push(fd);
                } catch {
                    // cross-origin frames are inaccessible; skip them.
                }
            }

            for (const doc of docs) {
                // Look for the create-event block canvas node.
                const blockCanvas = doc.querySelector('.soli-block-create-event');
                if (!blockCanvas) continue;

                // The canvas document's <head> must contain at least one
                // Emotion-generated <style> element (key attribute starts with
                // the cache key used by IframeAwareMuiProvider: 'soli-ce').
                const emotionStyles = Array.from(doc.head.querySelectorAll('style[data-emotion]'));
                return emotionStyles.some(el => el.getAttribute('data-emotion')?.startsWith('soli-ce'));
            }

            return false;
        });

        expect(
            muiStylesInCanvasDocument,
            'Emotion/MUI styles should be present in the editor canvas document (iframe or main)'
        ).toBe(true);
    });
});
