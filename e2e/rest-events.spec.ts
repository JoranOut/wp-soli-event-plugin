/**
 * REST visibility lock-down.
 *   R3  GET /events/future/{p}/{n}  — public list (S1 source of truth)
 *   R2  GET /events/{id}            — per-event dates (editor read path; F2)
 *
 * Asserts the CONFIRMED policy. Cells where current code disagrees are the
 * Phase 1/2 work list (they go red here on purpose).
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor, ALL_ROLES } from './fixtures/roles';
import {
    listMatrix,
    title,
    SEED_PREFIX,
    type CatalogueKey,
    type Role,
} from './fixtures/catalogue';

const CATALOGUE_KEYS = Object.keys(listMatrix) as CatalogueKey[];

test.describe('REST /events/future — public list', () => {
    for (const role of ALL_ROLES) {
        test(`list obeys the matrix for ${role}`, async () => {
            const api = await apiFor(role);
            const res = await api.get('/wp-json/soli_event/v1/events/future/1/100');
            expect(res.ok()).toBeTruthy();
            const body = await res.json();
            const events = (body.events || []) as Array<{ post_title: string }>;
            const titles = events.map((e) => e.post_title);

            for (const key of CATALOGUE_KEYS) {
                const expected = listMatrix[key][role as Role];
                const present = titles.includes(title(key));
                // Real title present iff the event is 'full' for this role.
                // 'masked' and 'hidden' both mean the real title is absent
                // (masked rows appear only as the literal "private").
                expect(
                    present,
                    `${title(key)} should be ${expected === 'full' ? 'present' : 'absent'} for ${role}`
                ).toBe(expected === 'full');
            }

            // PRIVATE dates must still surface for not-logged-in users, just
            // anonymised to "private" (never fully dropped).
            if (role === 'anonymous') {
                expect(titles).toContain('private');
            }
            await api.dispose();
        });
    }
});

test.describe('REST /events/{id} — per-event dates (F2)', () => {
    // The workflow states PLANNED / PENDING_APPROVAL / OPTION must never leak to
    // non-editors; editors must see everything.

    // Resolve title -> id once using the editor context (can see every status).
    const idByKey: Partial<Record<CatalogueKey, number>> = {};
    test.beforeAll(async () => {
        const api = await apiFor('editor');
        const res = await api.get(
            `/wp-json/wp/v2/soli_event?search=${encodeURIComponent(SEED_PREFIX)}&status=any&per_page=100`
        );
        const posts = res.ok() ? ((await res.json()) as Array<{ id: number; title: { rendered: string } }>) : [];
        for (const key of CATALOGUE_KEYS) {
            const match = posts.find((p) => p.title.rendered === title(key));
            if (match) idByKey[key] = match.id;
        }
        await api.dispose();
    });

    async function statusesFor(role: Role, key: CatalogueKey): Promise<string[]> {
        const id = idByKey[key];
        expect(id, `seed id for ${title(key)} not resolved`).toBeTruthy();
        const api = await apiFor(role);
        const res = await api.get(`/wp-json/soli_event/v1/events/${id}`);
        const rows = res.status() === 204 ? [] : ((await res.json()) as Array<{ status: string }>);
        await api.dispose();
        return rows.map((r) => r.status);
    }

    test('editor sees every date status', async () => {
        expect(await statusesFor('editor', 'date-planned')).toContain('PLANNED');
        expect(await statusesFor('editor', 'date-pending')).toContain('PENDING_APPROVAL');
        expect(await statusesFor('editor', 'private-only')).toContain('PRIVATE');
    });

    test('anonymous never receives workflow-state dates', async () => {
        expect(await statusesFor('anonymous', 'date-planned')).not.toContain('PLANNED');
        expect(await statusesFor('anonymous', 'date-pending')).not.toContain('PENDING_APPROVAL');
        expect(await statusesFor('anonymous', 'date-option')).not.toContain('OPTION');
    });

    test('subscriber never receives workflow-state dates', async () => {
        expect(await statusesFor('subscriber', 'date-planned')).not.toContain('PLANNED');
        expect(await statusesFor('subscriber', 'date-pending')).not.toContain('PENDING_APPROVAL');
    });
});
