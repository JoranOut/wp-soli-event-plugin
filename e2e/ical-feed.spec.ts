/**
 * Public iCal feed at /ical (S-ical). Exports PUBLIC upcoming dates only —
 * PRIVATE, workflow-state, past, and non-published events must never leak into
 * the exported calendar. ?categorie=<slug|id> filters by category.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor } from './fixtures/roles';
import { title } from './fixtures/catalogue';

async function feed(query = ''): Promise<{ status: number; contentType: string; body: string }> {
    const api = await apiFor('anonymous');
    const res = await api.get(`/ical${query}`); // request context follows the /ical -> /ical/ redirect
    const body = await res.text();
    const contentType = res.headers()['content-type'] || '';
    await api.dispose();
    return { status: res.status(), contentType, body };
}

const summaries = (body: string) =>
    body
        .split(/\r?\n/)
        .filter((l) => l.startsWith('SUMMARY:'))
        .map((l) => l.slice('SUMMARY:'.length));

test.describe('iCal feed /ical', () => {
    test('serves a valid VCALENDAR as text/calendar', async () => {
        const { status, contentType, body } = await feed();
        expect(status).toBe(200);
        expect(contentType).toContain('text/calendar');
        expect(body).toContain('BEGIN:VCALENDAR');
        expect(body).toContain('END:VCALENDAR');
    });

    test('includes PUBLIC upcoming events only', async () => {
        const { body } = await feed();
        const s = summaries(body);

        // Present: published events with a PUBLIC upcoming date.
        expect(s).toContain(title('date-public'));
        expect(s).toContain(title('time-future'));
        expect(s).toContain(title('public-and-private')); // its PUBLIC date

        // Absent: PRIVATE, workflow states, past, and non-published events.
        for (const key of [
            'date-private', 'private-only', 'date-planned', 'date-pending', 'date-option',
            'time-past', 'no-public-date', 'post-draft', 'post-pending', 'post-private', 'post-future',
        ] as const) {
            expect(s, `${title(key)} must not be exported`).not.toContain(title(key));
        }
        // PRIVATE masking must not leak in either: no "private" placeholder rows.
        expect(s).not.toContain('private');
    });

    test('?categorie filters to a category', async () => {
        const { body } = await feed('?categorie=viz-nc');
        const s = summaries(body);
        expect(s).toContain(title('nc-early' as any));
        expect(s).toContain(title('nc-concert' as any));
        expect(s).not.toContain(title('date-public')); // uncategorised, excluded
    });

    test('unknown category yields an empty calendar', async () => {
        const { status, body } = await feed('?categorie=this-category-does-not-exist');
        expect(status).toBe(200);
        expect(body).toContain('BEGIN:VCALENDAR');
        expect(body).not.toContain('BEGIN:VEVENT');
    });
});
