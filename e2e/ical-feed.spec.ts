/**
 * Public iCal feed at /ical (RFC 5545 VCALENDAR). Exports PUBLIC upcoming dates
 * only — PRIVATE, workflow-state (PENDING_APPROVAL/PLANNED/OPTION), past, and
 * non-published events must never leak into the exported calendar.
 * ?categorie=<slug|id> (alias ?category=) filters by category.
 *
 * An event appears iff it has >=1 PUBLIC upcoming date — i.e. exactly the
 * `archiveListable` condition, reused here as the source of truth.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor } from './fixtures/roles';
import { archiveListable, title, type CatalogueKey } from './fixtures/catalogue';

async function feed(query = ''): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    const api = await apiFor('anonymous');
    const res = await api.get(`/ical${query}`); // request context follows /ical -> /ical/
    const body = await res.text();
    const headers = res.headers();
    await api.dispose();
    return { status: res.status(), headers, body };
}

const summaries = (body: string) =>
    body
        .split(/\r?\n/)
        .filter((l) => l.startsWith('SUMMARY:'))
        .map((l) => l.slice('SUMMARY:'.length));

const countExact = (body: string, t: string) => summaries(body).filter((s) => s === t).length;

// nc-* are category-isolated fixtures, not part of the standard matrix.
const t = (key: string) => title(key as CatalogueKey);

let catNcId = 0;
let catPrivId = 0;

test.beforeAll(async () => {
    const api = await apiFor('anonymous');
    catNcId = (await (await api.get('/wp-json/wp/v2/categories?slug=viz-nc')).json())[0]?.id;
    catPrivId = (await (await api.get('/wp-json/wp/v2/categories?slug=viz-nc-priv')).json())[0]?.id;
    await api.dispose();
    expect(catNcId, 'viz-nc id').toBeTruthy();
    expect(catPrivId, 'viz-nc-priv id').toBeTruthy();
});

test.describe('iCal feed — envelope & headers', () => {
    test('serves a valid VCALENDAR as text/calendar with a filename', async () => {
        const { status, headers, body } = await feed();
        expect(status).toBe(200);
        expect(headers['content-type']).toContain('text/calendar');
        expect(headers['content-disposition'] || '').toContain('.ics');
        expect(body).toContain('BEGIN:VCALENDAR');
        expect(body).toContain('VERSION:2.0');
        expect(body).toContain('PRODID:');
        expect(body.trimEnd().endsWith('END:VCALENDAR')).toBeTruthy();
    });
});

test.describe('iCal feed — status / post-status / time matrix', () => {
    // Covers PUBLIC vs PRIVATE/PENDING_APPROVAL/PLANNED/OPTION, publish vs
    // draft/pending/private/future, and future vs past — one assertion per cell.
    test('an event is exported iff it has a PUBLIC upcoming date', async () => {
        const { body } = await feed();
        const present = summaries(body);
        for (const key of Object.keys(archiveListable) as CatalogueKey[]) {
            const shouldExport = archiveListable[key];
            expect(
                present.includes(title(key)),
                `${title(key)} should ${shouldExport ? 'be' : 'NOT be'} in the feed`
            ).toBe(shouldExport);
        }
    });

    test('PRIVATE dates never leak — not even masked as "private"', async () => {
        const { body } = await feed();
        const present = summaries(body);
        expect(present).not.toContain(t('date-private'));
        expect(present).not.toContain(t('private-only'));
        expect(present).not.toContain('private'); // no masked placeholder
    });

    test('recurring events emit one VEVENT per PUBLIC date', async () => {
        const { body } = await feed();
        // recurring = 3 PUBLIC dates; recurring-mixed = 2 PUBLIC (+1 PRIVATE, +1 PLANNED excluded).
        expect(countExact(body, t('recurring'))).toBe(3);
        expect(countExact(body, t('recurring-mixed'))).toBe(2);
        // public-and-private has exactly one PUBLIC date -> one VEVENT.
        expect(countExact(body, t('public-and-private'))).toBe(1);
    });
});

test.describe('iCal feed — VEVENT structure', () => {
    test('each VEVENT has UID, UTC timestamps, SUMMARY, LOCATION and URL', async () => {
        const { body } = await feed('?categorie=viz-nc'); // small, deterministic set
        const blocks = body.split('BEGIN:VEVENT').slice(1).map((b) => b.split('END:VEVENT')[0]);
        expect(blocks.length).toBeGreaterThan(0);
        for (const b of blocks) {
            expect(b).toMatch(/UID:.+@soli\.nl/);
            expect(b).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
            expect(b).toMatch(/DTSTART:\d{8}T\d{6}Z/);
            expect(b).toMatch(/DTEND:\d{8}T\d{6}Z/);
            expect(b).toMatch(/SUMMARY:.+/);
            expect(b).toMatch(/LOCATION:.+/);
            expect(b).toMatch(/URL:http.+\/evenement\//);
        }
    });
});

test.describe('iCal feed — category filtering', () => {
    test('?categorie=<slug> returns only that category', async () => {
        const s = summaries((await feed('?categorie=viz-nc')).body);
        expect(s).toContain(t('nc-early'));
        expect(s).toContain(t('nc-concert'));
        expect(s).not.toContain(title('date-public')); // uncategorised
        expect(s).not.toContain(title('concert'));
    });

    test('?categorie=<numeric id> matches the slug result', async () => {
        const bySlug = summaries((await feed('?categorie=viz-nc')).body).sort();
        const byId = summaries((await feed(`?categorie=${catNcId}`)).body).sort();
        expect(byId).toEqual(bySlug);
    });

    test('?category= alias works', async () => {
        const s = summaries((await feed('?category=viz-nc')).body);
        expect(s).toContain(t('nc-early'));
        expect(s).toContain(t('nc-concert'));
    });

    test('category filtering still excludes non-PUBLIC (private-only category -> empty)', async () => {
        // viz-nc-priv contains a single PRIVATE concert; the feed must stay empty.
        const { status, body } = await feed('?categorie=viz-nc-priv');
        expect(status).toBe(200);
        expect(body).toContain('BEGIN:VCALENDAR');
        expect(body).not.toContain('BEGIN:VEVENT');
        expect(summaries(body)).not.toContain(t('nc-private'));
    });

    test('unknown category yields an empty calendar', async () => {
        const { status, body } = await feed('?categorie=this-category-does-not-exist');
        expect(status).toBe(200);
        expect(body).toContain('BEGIN:VCALENDAR');
        expect(body).not.toContain('BEGIN:VEVENT');
    });
});
