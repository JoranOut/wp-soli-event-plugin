/**
 * Building feed at /ical/gebouw (token-protected): upcoming PUBLIC and PRIVATE
 * dates in the Muziekcentrum with real titles and booked rooms, for heating.
 * The seeder sets the token to "viz-building-token".
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor } from './fixtures/roles';
import { title, type CatalogueKey } from './fixtures/catalogue';

const TOKEN = 'viz-building-token';
const t = (key: string) => title(key as CatalogueKey);

async function feed(query: string) {
    const api = await apiFor('anonymous');
    const res = await api.get(`/ical/gebouw/${query}`);
    const result = { status: res.status(), headers: res.headers(), body: await res.text() };
    await api.dispose();
    return result;
}

/** VEVENTs as {summary, location}, with folded lines joined back. */
function events(body: string) {
    const unfolded = body.replace(/\r\n /g, '');
    return unfolded
        .split('BEGIN:VEVENT')
        .slice(1)
        .map((block) => {
            const field = (name: string) =>
                block.split(/\r\n/).find((l) => l.startsWith(`${name}:`))?.slice(name.length + 1) ?? '';
            return { summary: field('SUMMARY'), location: field('LOCATION') };
        });
}

const summaries = (body: string) => events(body).map((e) => e.summary);

test.describe('Building iCal feed — access', () => {
    test('refuses a request without a token', async () => {
        const { status, body } = await feed('');
        expect(status).toBe(403);
        expect(body).not.toContain('BEGIN:VCALENDAR');
    });

    test('refuses a wrong token', async () => {
        const { status } = await feed('?token=wrong');
        expect(status).toBe(403);
    });

    test('serves a VCALENDAR that asks to be refreshed every 15 minutes', async () => {
        const { status, headers, body } = await feed(`?token=${TOKEN}`);
        expect(status).toBe(200);
        expect(headers['content-type']).toContain('text/calendar');
        expect(headers['x-robots-tag']).toContain('noindex');
        expect(body).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT15M');
    });
});

test.describe('Building iCal feed — content', () => {
    test('exports upcoming PUBLIC and PRIVATE dates in the building with real titles', async () => {
        const present = summaries((await feed(`?token=${TOKEN}`)).body);
        expect(present).toContain(t('map-internal'));
        expect(present).toContain(t('bld-private'));
        expect(present).toContain(t('bld-norooms'));
        expect(present).not.toContain('private');
    });

    test('leaves out workflow states, past dates and external venues', async () => {
        const present = summaries((await feed(`?token=${TOKEN}`)).body);
        expect(present).not.toContain(t('bld-planned'));
        expect(present).not.toContain(t('bld-past'));
        expect(present).not.toContain(t('map-located'));
    });

    test('names the booked rooms in LOCATION', async () => {
        const all = events((await feed(`?token=${TOKEN}`)).body);
        const location = (key: string) => all.find((e) => e.summary === t(key))?.location;
        expect(location('map-internal')).toBe('Muziekcentrum Soli - Grote zaal');
        expect(location('bld-private')).toBe('Muziekcentrum Soli - Spiegelzaal\\, Studio 1');
        expect(location('bld-norooms')).toBe('Muziekcentrum Soli');
    });
});

test.describe('Building iCal feed — ?zaal filter', () => {
    test('keeps only dates booking one of the requested rooms', async () => {
        const present = summaries((await feed(`?token=${TOKEN}&zaal=studio-1`)).body);
        expect(present).toContain(t('bld-private'));
        expect(present).not.toContain(t('map-internal'));
        expect(present).not.toContain(t('bld-norooms'));
    });

    test('ORs a comma-separated list', async () => {
        const present = summaries((await feed(`?token=${TOKEN}&zaal=studio-1,grote-zaal`)).body);
        expect(present).toContain(t('bld-private'));
        expect(present).toContain(t('map-internal'));
    });

    test('returns an empty calendar for only unknown rooms', async () => {
        const { status, body } = await feed(`?token=${TOKEN}&zaal=kelder`);
        expect(status).toBe(200);
        expect(body).toContain('BEGIN:VCALENDAR');
        expect(summaries(body)).toHaveLength(0);
    });
});
