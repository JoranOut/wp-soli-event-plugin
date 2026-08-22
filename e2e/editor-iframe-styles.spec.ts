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
 * The check is performed inside the frame (or the top-level page when no
 * editor-canvas iframe exists) so it is compatible with both the legacy
 * full-page editor and the WP 7.1 iframe-based editor.
 */

import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { BLOCK_LOAD_TIMEOUT } from './helpers';

test.describe('Create Event block — MUI styles in editor canvas document', () => {
    test('Emotion/MUI styles are inserted into the editor canvas document', async ({ admin, page }) => {
        // Open a new soli_event post so the create-event block is present.
        await admin.visitAdminPage('/edit.php?post_type=soli_event');
        await page.getByRole('link', { name: 'Events' }).first().click();
        await page.locator('#wpbody-content').getByRole('link', { name: 'Add New Event' }).click();

        await page.locator('#editor').waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });

        // Dismiss known editor overlays before touching the canvas.
        // components-modal__screen-overlay can appear on top of the editor;
        // pressing Escape is the standard WP dismissal.
        const overlay = page.locator('.components-modal__screen-overlay');
        if (await overlay.isVisible().catch(() => false)) {
            await page.keyboard.press('Escape');
            await expect(overlay).toBeHidden();
        }

        // Dismiss the welcome guide if it appears.
        const guide = page.locator('.components-guide');
        await Promise.any([
            guide.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }).then(async () => {
                await page.keyboard.press('Escape');
                await expect(guide).toBeHidden();
            }),
            // WP 7.1+: block is inside the canvas iframe.
            page.frameLocator('iframe[name="editor-canvas"]')
                .getByLabel('Block: Create Event')
                .waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }),
            // Older WP: block is on the top-level page.
            page.getByLabel('Block: Create Event').waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }),
        ]);

        // Dismiss first-event wizard if it appears (it renders inside the canvas).
        const wizard = page.locator('.first-event-wizard');
        if (await wizard.isVisible().catch(() => false)) {
            await wizard.getByRole('button', { name: 'Skip' }).click();
            await expect(wizard).toBeHidden();
        }

        // Resolve the editor canvas: WP 7.1+ uses an iframe; older WP uses the
        // top-level page. Use frameLocator when the iframe is present so that
        // waiting for canvas elements is correctly scoped to the frame.
        const canvasIframe = page.locator('iframe[name="editor-canvas"]');
        const hasIframe = (await canvasIframe.count()) > 0;
        const canvas = hasIframe
            ? page.frameLocator('iframe[name="editor-canvas"]')
            : page;

        // Wait for the Create Event block to be present in the canvas.
        await canvas.locator('.soli-block-create-event').waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });

        // Verify that at least one Emotion <style> with the 'soli-ce' key
        // exists in the same document as the canvas block.  When iframed, this
        // must be the iframe's document; when not iframed, the main document.
        const muiStylesInCanvasDocument = hasIframe
            ? await page.frameLocator('iframe[name="editor-canvas"]').locator('html').evaluate((html) => {
                const styles = Array.from(html.ownerDocument.head.querySelectorAll('style[data-emotion]'));
                return styles.some((el) => el.getAttribute('data-emotion')?.startsWith('soli-ce'));
            })
            : await page.evaluate(() => {
                const styles = Array.from(document.head.querySelectorAll('style[data-emotion]'));
                return styles.some((el) => el.getAttribute('data-emotion')?.startsWith('soli-ce'));
            });

        expect(
            muiStylesInCanvasDocument,
            'Emotion/MUI styles should be present in the editor canvas document (iframe or main)'
        ).toBe(true);
    });
});
