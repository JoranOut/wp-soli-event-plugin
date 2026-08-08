/**
 * Location editing via the create-event block's location picker: every
 * location row carries an edit button that opens a prefilled modal with a
 * shared-location warning; saving posts to /location/{id}, which updates the
 * venue for every event date it is assigned to.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor } from './fixtures/roles';
import { uniqueTitle, BLOCK_LOAD_TIMEOUT } from './helpers';

test.describe('Location editing (create-event picker)', () => {
    test('edit opens a warning modal and saves the shared location', async ({ admin, page }) => {
        // Seed a location through the API (unique name so search isolates it).
        const name = uniqueTitle('Edit Venue');
        const api = await apiFor('editor');
        const res = await api.post('/wp-json/soli_event/v1/location/', {
            data: { name, address: 'Teststraat 1, Driehuis' },
        });
        expect(res.ok()).toBeTruthy();

        await admin.visitAdminPage('post-new.php', 'post_type=soli_event');
        await page.locator('#editor').waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });

        // Same block-load dance as helpers.createSingleEvent: the guide may
        // cover the editor, and the first-event wizard covers the block.
        const guide = page.locator('.components-guide');
        const eventBlock = page.getByLabel('Block: Create Event');
        const winner = await Promise.race([
            guide.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }).then(() => 'guide'),
            eventBlock.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT }).then(() => 'block'),
        ]);
        if (winner === 'guide') {
            await page.keyboard.press('Escape');
            await expect(guide).toBeHidden();
            await eventBlock.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
        }
        const wizard = page.locator('.first-event-wizard');
        await wizard.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
        await wizard.getByRole('button', { name: 'Skip' }).click();
        await expect(wizard).toBeHidden();

        // Open the picker, search the seeded venue, and edit it.
        await page.getByRole('button', { name: 'Choose a location' }).click();
        await page.locator('.location-picker-modal').getByRole('searchbox').fill(name);
        const row = page.locator('.location', { hasText: name });
        await row.getByRole('button', { name: 'edit' }).click();

        const editor = page.locator('.location-editor');
        await expect(editor).toContainText('changes apply to every event date');
        await expect(editor.locator('input[name="name"]')).toHaveValue(name);

        await editor.locator('textarea[name="address"]').fill('Nieuwstraat 99, Velsen');
        await editor.getByRole('button', { name: 'Save changes' }).click();

        // The list refreshes with the updated address...
        await expect(page.locator('.location', { hasText: name })).toContainText('Nieuwstraat 99, Velsen');

        // ...and the change is persisted for everything using this location.
        const check = await api.get(
            `/wp-json/soli_event/v1/location/search?query=${encodeURIComponent(name)}&limit=5`
        );
        const found = await check.json();
        expect(found[0].address).toBe('Nieuwstraat 99, Velsen');
    });
});
