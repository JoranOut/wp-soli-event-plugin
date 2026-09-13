/**
 * Events > Locations admin screen: full CRUD on wp_event_location.
 *
 * Gated on edit_others_posts: a location is shared by every event date that
 * uses it, across other people's events, so editors and administrators manage
 * them and authors (who may create one while scheduling) do not. Deleting is
 * refused while any event date still points at the location.
 *
 * The create-event picker no longer edits locations; it only searches and
 * creates them (see location-searcher.js).
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor, pageFor } from './fixtures/roles';
import { uniqueTitle } from './helpers';

const LOCATIONS_PAGE = '/wp-admin/edit.php?post_type=soli_event&page=soli_event_locations';
const denied = /not allowed to access this page|Sorry, you are not allowed/i;

async function seedLocation(name: string, address = 'Teststraat 1, Driehuis') {
    const api = await apiFor('editor');
    const res = await api.post('/wp-json/soli_event/v1/location/', { data: { name, address } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    await api.dispose();
    return body as { id: number; name: string; address: string };
}

test.describe('Locations admin page - gating', () => {
    test('editor and admin may open it', async ({ browser }) => {
        for (const role of ['editor', 'admin'] as const) {
            const { context, page } = await pageFor(browser, role);
            await page.goto(LOCATIONS_PAGE);
            await expect(page.getByText(denied)).toHaveCount(0);
            await expect(page.getByRole('heading', { name: 'Locations', exact: true })).toBeVisible();
            await context.close();
        }
    });

    test('author and subscriber are denied', async ({ browser }) => {
        for (const role of ['author', 'subscriber'] as const) {
            const { context, page } = await pageFor(browser, role);
            await page.goto(LOCATIONS_PAGE);
            await expect(page.getByText(denied)).toBeVisible();
            await context.close();
        }
    });

    test('the submenu appears under Events for editors', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'editor');
        await page.goto('/wp-admin/edit.php?post_type=soli_event');
        await expect(
            page.locator('#adminmenu').getByRole('link', { name: 'Locations', exact: true })
        ).toBeVisible();
        await context.close();
    });
});

test.describe('Locations admin page - CRUD', () => {
    test('create, edit and delete a location', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'editor');
        const name = uniqueTitle('Admin Venue');

        // Create.
        await page.goto(LOCATIONS_PAGE);
        await page.locator('#soli-location-name').fill(name);
        await page.locator('#soli-location-address').fill('Kerkpad 83, Santpoort-Noord');
        await page.getByRole('button', { name: 'Add New Location' }).click();
        await expect(page.locator('.soli-locations-notice')).toContainText('Location added.');
        const row = page.locator('.soli-locations-table tr', { hasText: name });
        await expect(row).toContainText('Kerkpad 83, Santpoort-Noord');
        await expect(row.locator('td').nth(2)).toHaveText('0');

        // Edit.
        await row.hover();
        await row.getByRole('link', { name: 'Edit' }).click();
        await expect(page.getByRole('heading', { name: 'Edit Location' })).toBeVisible();
        await expect(page.locator('#soli-location-name')).toHaveValue(name);
        await page.locator('#soli-location-address').fill('Nieuwstraat 99, Velsen');
        await page.getByRole('button', { name: 'Update Location' }).click();
        await expect(page.locator('.soli-locations-notice')).toContainText('Location updated.');
        await expect(page.locator('.soli-locations-table tr', { hasText: name })).toContainText(
            'Nieuwstraat 99, Velsen'
        );

        // The change reaches everything that reads the location.
        const api = await apiFor('editor');
        const found = await (
            await api.get(`/wp-json/soli_event/v1/location/search?query=${encodeURIComponent(name)}&limit=5`)
        ).json();
        expect(found[0].address).toBe('Nieuwstraat 99, Velsen');

        // Delete (the row has no event dates, so the action is offered).
        const fresh = page.locator('.soli-locations-table tr', { hasText: name });
        await fresh.hover();
        page.once('dialog', (dialog) => dialog.accept());
        await fresh.getByRole('link', { name: 'Delete' }).click();
        await expect(page.locator('.soli-locations-notice')).toContainText('Location deleted.');
        await expect(page.locator('.soli-locations-table tr', { hasText: name })).toHaveCount(0);

        const gone = await api.get(
            `/wp-json/soli_event/v1/location/search?query=${encodeURIComponent(name)}&limit=5`
        );
        expect(gone.status()).toBe(204);
        await api.dispose();
        await context.close();
    });

    test('a location in use offers no delete action and refuses a forced delete', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'editor');
        await page.goto(LOCATIONS_PAGE);

        // The seeded catalogue assigns VIZ Concertzaal to event dates.
        const row = page.locator('.soli-locations-table tr', { hasText: 'VIZ Concertzaal' }).first();
        await expect(row).toBeVisible();
        expect(Number(await row.locator('td').nth(2).textContent())).toBeGreaterThan(0);
        await row.hover();
        await expect(row.getByRole('link', { name: 'Delete' })).toHaveCount(0);

        // Fire the delete request without the per-row nonce that only an
        // unused row's link carries: WordPress refuses it before the handler.
        const id = await row.getAttribute('data-location-id');
        const api = await apiFor('editor');
        const res = await api.get(`/wp-admin/admin-post.php?action=soli_event_delete_location&id=${id}`);
        expect(res.status()).toBeGreaterThanOrEqual(400);
        await page.reload();
        await expect(
            page.locator('.soli-locations-table tr', { hasText: 'VIZ Concertzaal' }).first()
        ).toBeVisible();
        await api.dispose();
        await context.close();
    });

    test('empty name or address is rejected', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'editor');
        await page.goto(LOCATIONS_PAGE);
        // Bypass the browser's `required` validation so the server rule is what is tested.
        await page.evaluate(() => document.querySelector('.soli-location-form')?.setAttribute('novalidate', ''));
        await page.locator('#soli-location-name').fill(uniqueTitle('Nameless'));
        await page.getByRole('button', { name: 'Add New Location' }).click();
        await expect(page.locator('.soli-locations-notice')).toContainText('Name and address are both required.');
        await context.close();
    });
});

test.describe('create-event picker no longer edits locations', () => {
    test('POST /location/{id} requires edit_others_posts', async () => {
        const seeded = await seedLocation(uniqueTitle('REST Venue'));

        // An author may create (see rest-write.spec.ts) but not change a shared location.
        const author = await apiFor('author');
        const denied = await author.post(`/wp-json/soli_event/v1/location/${seeded.id}`, {
            data: { name: seeded.name, address: 'Changed by author' },
        });
        expect([401, 403]).toContain(denied.status());
        await author.dispose();

        const editor = await apiFor('editor');
        const ok = await editor.post(`/wp-json/soli_event/v1/location/${seeded.id}`, {
            data: { name: seeded.name, address: 'Changed by editor' },
        });
        expect(ok.ok()).toBeTruthy();
        await editor.dispose();
    });
});
