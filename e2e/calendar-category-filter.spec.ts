/**
 * Orchestra filter on the event-view-calendar block: a dropdown with the
 * categories under the 'orkesten' parent. Seeded: VIZ:ork-a (viz-ork-a) and
 * VIZ:ork-b (viz-ork-b), both PUBLIC on the same day, +1 day.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { addDays, format } from 'date-fns';
import { createCalendarPage } from './helpers';
import { apiFor, pageFor } from './fixtures/roles';

const eventDay = () => addDays(new Date(), 1);

test.describe('orkesten categories (REST)', () => {
    test('lists only the categories under the orkesten parent', async () => {
        const api = await apiFor('anonymous');
        const res = await api.get('/wp-json/soli_event/v1/orkesten-categories');
        expect(res.status()).toBe(200);
        const slugs = ((await res.json()) as Array<{ slug: string }>).map((c) => c.slug);
        expect(slugs).toEqual(expect.arrayContaining(['viz-ork-a', 'viz-ork-b']));
        expect(slugs).not.toContain('orkesten');
        expect(slugs).not.toContain('viz-nc');
        await api.dispose();
    });

    test('calendar rows carry their category ids', async () => {
        const api = await apiFor('anonymous');
        const categories = (await (
            await api.get('/wp-json/soli_event/v1/orkesten-categories')
        ).json()) as Array<{ id: number; slug: string }>;
        const orkA = categories.find((c) => c.slug === 'viz-ork-a')!;

        const start = format(eventDay(), 'yyyy-MM-dd');
        const end = format(addDays(eventDay(), 1), 'yyyy-MM-dd');
        const res = await api.get(
            `/wp-json/soli_event/v1/events?start_date=${start}&end_date=${end}`
        );
        const rows = (await res.json()) as Array<{ post_title: string; category_ids: number[] }>;
        const row = rows.find((r) => r.post_title === 'VIZ:ork-a')!;
        expect(row.category_ids).toContain(orkA.id);
        await api.dispose();
    });
});

test.describe('event-view-calendar block — orchestra filter', () => {
    test('shows only the events of the picked orchestra', async ({ admin, page, editor, browser }) => {
        await createCalendarPage({ admin, page, editor });
        const permalink = page.url();

        // The phone month list shows every event; the grid folds a busy day
        // into "+N more". A date crossing midnight is listed on both days.
        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.setViewportSize({ width: 390, height: 844 });
        await anon.goto(permalink);

        // The seeded day can fall in next month.
        if (eventDay().getMonth() !== new Date().getMonth()) {
            await anon.locator('.soli-cal-button-next').click();
        }

        const orkA = anon.locator('.soli-cal-list-event', { hasText: 'VIZ:ork-a' });
        const orkB = anon.locator('.soli-cal-list-event', { hasText: 'VIZ:ork-b' });
        await expect(orkA.first()).toBeVisible({ timeout: 30000 });
        await expect(orkB.first()).toBeVisible();

        const dropdown = anon.getByRole('combobox', { name: 'Filter by orchestra' });
        await expect(dropdown).toHaveText('All orchestras');
        await dropdown.click();
        await expect(anon.getByRole('option', { name: 'VIZ Next-Concert' })).toHaveCount(0);
        await anon.getByRole('option', { name: 'VIZ Orkest A' }).click();
        await anon.keyboard.press('Escape');

        await expect(dropdown).toHaveText('VIZ Orkest A');
        await expect(orkA.first()).toBeVisible();
        await expect(orkB).toHaveCount(0);

        await dropdown.click();
        await anon.getByRole('option', { name: 'VIZ Orkest A' }).click();
        await anon.keyboard.press('Escape');
        await expect(orkB.first()).toBeVisible();

        await context.close();
    });
});
