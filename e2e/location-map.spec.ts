/**
 * event-location-map block (single event page).
 *
 * Policy:
 *   - Shows the venue of the next upcoming date by default; ?event=<date id>
 *     (the links the upcoming-dates list renders) switches it to that date's
 *     venue.
 *   - An internal date (rooms booked, no external location) falls back to the
 *     block's home venue (default Muziekcentrum, Kerkpad 83, Santpoort-Noord).
 *   - A date without a location or rooms renders nothing on the front end;
 *     editors see an explanatory note instead.
 *
 * Seeded venues carry pre-cached coordinates (geocoded_address matches the
 * address), so rendering never calls the remote Nominatim geocoder. Tile
 * requests are aborted per test: Leaflet initializes fine without tiles and
 * the suite stays hermetic.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { pageFor } from './fixtures/roles';

const url = (slug: string) => `/evenement/${slug}/`;

// Mirrors seed.php's 3c fixtures. data-lat/lng are PHP-printed floats, so
// trailing zeros of the seeded DECIMAL(10,7) values are dropped.
const HALL = { lat: '52.4568', lng: '4.6404', name: 'VIZ Concertzaal' };
const CHURCH = { lat: '52.453', lng: '4.636', name: 'VIZ Dorpskerk' };

async function blockTiles(page: any) {
    await page.route('**/tile.openstreetmap.org/**', (route: any) => route.abort());
}

test.describe('event-location-map block — venue map on the single page', () => {
    test('shows the next upcoming date\'s venue by default (anonymous)', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'anonymous');
        await blockTiles(page);
        await page.goto(url('viz-map-located'));

        const map = page.locator('.soli-event-location-map__map');
        await expect(map).toHaveAttribute('data-lat', HALL.lat);
        await expect(map).toHaveAttribute('data-lng', HALL.lng);
        await expect(page.locator('.soli-event-location-map__venue')).toContainText(HALL.name);

        // The Leaflet bundle picked the container up and mounted a map.
        await expect(page.locator('.soli-event-location-map__map.leaflet-container')).toBeVisible();

        await context.close();
    });

    test('follows ?event=<date id> to that date\'s venue', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'anonymous');
        await blockTiles(page);
        await page.goto(url('viz-map-located'));

        // The upcoming-dates list links each date as ?event=<date id>; the
        // second row is the later date, held at the other venue.
        const secondDate = page.locator('.soli-event-dates__list li a').nth(1);
        const href = await secondDate.getAttribute('href');
        expect(href).toContain('?event=');
        await page.goto(href!);

        const map = page.locator('.soli-event-location-map__map');
        await expect(map).toHaveAttribute('data-lat', CHURCH.lat);
        await expect(map).toHaveAttribute('data-lng', CHURCH.lng);
        await expect(page.locator('.soli-event-location-map__venue')).toContainText(CHURCH.name);

        await context.close();
    });

    test('renders a directions link for the venue address', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'anonymous');
        await blockTiles(page);
        await page.goto(url('viz-map-located'));

        const directions = page.locator('.soli-event-location-map__directions');
        await expect(directions).toHaveAttribute('href', /google\.com\/maps\/dir/);

        await context.close();
    });

    test('internal date (rooms, no external location) falls back to the home venue', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'anonymous');
        await blockTiles(page);
        await page.goto(url('viz-map-internal'));

        const map = page.locator('.soli-event-location-map__map');
        await expect(map).toHaveAttribute('data-lat', '52.44');
        await expect(map).toHaveAttribute('data-lng', '4.63');
        const venue = page.locator('.soli-event-location-map__venue');
        await expect(venue).toContainText('Muziekcentrum');
        await expect(venue).toContainText('Kerkpad 83, Santpoort-Noord');

        await context.close();
    });

    test('date without a location: hidden for anonymous visitors', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'anonymous');
        await page.goto(url('viz-date-public'));

        await expect(page.locator('.soli-event-location-map')).toHaveCount(0);

        await context.close();
    });

    test('date without a location: editors see the explanatory note', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'editor');
        await page.goto(url('viz-date-public'));

        const empty = page.locator('.soli-event-location-map--empty');
        await expect(empty).toContainText('No location is set for this event date');

        await context.close();
    });
});
