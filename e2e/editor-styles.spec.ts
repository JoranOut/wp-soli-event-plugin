/**
 * Editor styling: MUI/Emotion runtime styles must land in the document that
 * actually renders the markup.
 *
 * The compiled block stylesheets are registered as `editor_style`, so they
 * reach the editor canvas on their own. MUI injects its styles at runtime via
 * Emotion, which defaults to the parent `wp-admin` document — once WordPress
 * renders block content inside the `editor-canvas` iframe, those styles never
 * reach the elements they style and the block renders unstyled.
 *
 * `events/inc/editor-style-scope.js` resolves the document it is mounted in and
 * caches per document, so both surfaces must hold: block content in the canvas
 * (iframed on newer WordPress, inline on older) and the `@wordpress/components`
 * Modals, which portal into the parent document.
 *
 * These specs assert computed style rather than only the presence of a style
 * tag: a MUI Switch `<span>` that resolves to `flex` instead of its unstyled
 * `inline` default proves the rules reached the element.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { BLOCK_LOAD_TIMEOUT, uniqueTitle } from './helpers';

test.describe('Editor MUI styles', () => {
    test.describe.configure({ mode: 'parallel' });

    test('styles the create-event block in whichever document renders it', async ({ admin, page }) => {
        await admin.createNewPost({ postType: 'soli_event', title: uniqueTitle('Editor Styles') });

        // The block editor iframes its canvas on newer WordPress versions and
        // renders inline on older ones. Resolve the block through whichever
        // applies, then assert against the block's own ownerDocument.
        const canvas = page.locator('iframe[name="editor-canvas"]');
        const iframed = await canvas
            .waitFor({ state: 'attached', timeout: 15_000 })
            .then(() => true)
            .catch(() => false);

        const scope = iframed ? page.frameLocator('iframe[name="editor-canvas"]') : page;
        const block = scope.locator('.soli-block-create-event');
        await block.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });

        // A brand-new event opens the wizard on top of the block; skip it so
        // the block itself renders its MUI controls.
        const wizard = page.locator('.first-event-wizard');
        await wizard.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
        await wizard.getByRole('button', { name: 'Skip' }).click();
        await expect(wizard).toBeHidden();

        const emotionKeys = await block.evaluate((el: Element) =>
            Array.from(el.ownerDocument.querySelectorAll('style[data-emotion]')).map((style) =>
                (style.getAttribute('data-emotion') || '').split(' ')[0]
            )
        );
        expect(emotionKeys).toContain('soli-event');

        // MuiSwitch-root is a <span>: unstyled it computes to `inline`.
        const toggle = block.locator('.MuiSwitch-root').first();
        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveCSS('display', 'flex');
    });

    test('styles MUI inside a Modal, which portals into the parent document', async ({ admin, page }) => {
        await admin.createNewPost({ postType: 'soli_event', title: uniqueTitle('Editor Styles Modal') });

        // The first-event wizard is a @wordpress/components Modal: it renders
        // in the parent admin document even when the canvas is iframed.
        const wizard = page.locator('.first-event-wizard');
        await wizard.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });

        const modalDocumentIsMain = await wizard.evaluate(
            (el: Element) => el.ownerDocument === el.ownerDocument.defaultView?.top?.document
        );
        expect(modalDocumentIsMain).toBe(true);

        const emotionKeys = await wizard.evaluate((el: Element) =>
            Array.from(el.ownerDocument.querySelectorAll('style[data-emotion]')).map((style) =>
                (style.getAttribute('data-emotion') || '').split(' ')[0]
            )
        );
        expect(emotionKeys).toContain('soli-event');

        const field = wizard.locator('.MuiInputBase-root').first();
        await expect(field).toBeVisible();
        await expect(field).toHaveCSS('display', 'flex');
    });
});
