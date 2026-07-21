/**
 * REST write paths + admin_notes gating.
 *   R4  POST /events/{id}     — requires edit_posts
 *   R6  POST /location        — requires edit_posts
 *   W1  write persists (round-trips through soli_event_apply_dates)
 *   W2  admin_notes read/write gated by cap soli_event_admin_notes (admin only)
 *
 * Uses a dedicated throwaway event (not the shared VIZ catalogue) so parallel
 * read specs are unaffected.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor } from './fixtures/roles';

const future = { start: '2030-01-01 20:00:00', end: '2030-01-01 22:00:00' };
const datesBody = (adminNotes?: string) => [
    {
        start_date: future.start,
        end_date: future.end,
        status: 'PUBLIC',
        is_concert: false,
        notes: '',
        ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
    },
];

let writeId = 0;

test.beforeAll(async () => {
    const api = await apiFor('admin');
    const res = await api.post('/wp-json/wp/v2/soli_event', {
        data: { title: 'VIZ-write-target', status: 'publish' },
    });
    expect(res.ok()).toBeTruthy();
    writeId = (await res.json()).id;
    await api.dispose();
});

test.describe('POST /events/{id} — capability (R4)', () => {
    test('anonymous is denied', async () => {
        const api = await apiFor('anonymous');
        const res = await api.post(`/wp-json/soli_event/v1/events/${writeId}`, { data: datesBody() });
        expect([401, 403]).toContain(res.status());
        await api.dispose();
    });

    test('subscriber is denied', async () => {
        const api = await apiFor('subscriber');
        const res = await api.post(`/wp-json/soli_event/v1/events/${writeId}`, { data: datesBody() });
        expect([401, 403]).toContain(res.status());
        await api.dispose();
    });

    test('editor may write and the date persists (W1)', async () => {
        const api = await apiFor('editor');
        const res = await api.post(`/wp-json/soli_event/v1/events/${writeId}`, { data: datesBody() });
        expect(res.ok()).toBeTruthy();

        const back = await api.get(`/wp-json/soli_event/v1/events/${writeId}`);
        const rows = (await back.json()) as Array<{ start_date: string; status: string }>;
        expect(rows.some((r) => r.status === 'PUBLIC' && r.start_date.startsWith('2030-01-01'))).toBeTruthy();
        await api.dispose();
    });
});

test.describe('POST /location — capability (R6)', () => {
    const body = { data: { name: 'VIZ Venue', address: 'Teststraat 1' } };
    test('anonymous is denied', async () => {
        const api = await apiFor('anonymous');
        const res = await api.post('/wp-json/soli_event/v1/location', body);
        expect([401, 403]).toContain(res.status());
        await api.dispose();
    });
    test('editor is allowed', async () => {
        const api = await apiFor('editor');
        const res = await api.post('/wp-json/soli_event/v1/location', body);
        expect(res.ok()).toBeTruthy();
        await api.dispose();
    });
});

test.describe('admin_notes gating (W2)', () => {
    test('editor cannot set admin_notes; admin can', async () => {
        // Editor writes a date carrying admin_notes — must NOT be stored.
        const ed = await apiFor('editor');
        await ed.post(`/wp-json/soli_event/v1/events/${writeId}`, { data: datesBody('editor-secret') });
        await ed.dispose();

        const adminApi = await apiFor('admin');
        let rows = (await (await adminApi.get(`/wp-json/soli_event/v1/events/${writeId}`)).json()) as Array<{
            admin_notes?: string;
        }>;
        expect(rows.some((r) => r.admin_notes === 'editor-secret')).toBeFalsy();

        // Admin writes admin_notes — must be stored.
        await adminApi.post(`/wp-json/soli_event/v1/events/${writeId}`, { data: datesBody('admin-secret') });
        rows = (await (await adminApi.get(`/wp-json/soli_event/v1/events/${writeId}`)).json()) as Array<{
            admin_notes?: string;
        }>;
        expect(rows.some((r) => r.admin_notes === 'admin-secret')).toBeTruthy();
        await adminApi.dispose();
    });

    test('admin_notes is stripped from the read response without the cap', async () => {
        // Ensure a value exists (admin set it above / set again to be safe).
        const adminApi = await apiFor('admin');
        await adminApi.post(`/wp-json/soli_event/v1/events/${writeId}`, { data: datesBody('admin-secret') });
        const adminRows = (await (await adminApi.get(`/wp-json/soli_event/v1/events/${writeId}`)).json()) as any[];
        expect(adminRows.every((r) => 'admin_notes' in r)).toBeTruthy();
        await adminApi.dispose();

        // Editor lacks soli_event_admin_notes → field must be absent.
        const ed = await apiFor('editor');
        const edRows = (await (await ed.get(`/wp-json/soli_event/v1/events/${writeId}`)).json()) as any[];
        expect(edRows.every((r) => !('admin_notes' in r))).toBeTruthy();
        await ed.dispose();
    });
});
