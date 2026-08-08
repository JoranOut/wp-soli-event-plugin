/**
 * /location/search visibility (R5, F9). Only the editor-only create-event block
 * uses it, so it must require `edit_posts`. Anonymous/subscriber must be denied.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor } from './fixtures/roles';

test.describe('REST /location/search — gating (F9)', () => {
    test('anonymous is denied', async () => {
        const api = await apiFor('anonymous');
        const res = await api.get('/wp-json/soli_event/v1/location/search?query=Muziek&limit=5');
        expect([401, 403]).toContain(res.status());
        await api.dispose();
    });

    test('subscriber is denied', async () => {
        const api = await apiFor('subscriber');
        const res = await api.get('/wp-json/soli_event/v1/location/search?query=Muziek&limit=5');
        expect([401, 403]).toContain(res.status());
        await api.dispose();
    });

    test('editor is allowed', async () => {
        const api = await apiFor('editor');
        const res = await api.get('/wp-json/soli_event/v1/location/search?query=Muziek&limit=5');
        expect(res.ok()).toBeTruthy();
        await api.dispose();
    });
});
