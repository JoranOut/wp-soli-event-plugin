/**
 * Admin Calendar View: the event popup links to the post editor, where the create-event block opens
 * its date list on the clicked date (?soli_event_date=<date id>) instead of the next upcoming one.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import type { FrameLocator, Page } from '@playwright/test';
import { addDays, differenceInCalendarMonths, format } from 'date-fns';
import { apiFor, BASE_URL } from './fixtures/roles';
import { BLOCK_LOAD_TIMEOUT, editorCanvas, uniqueTitle } from './helpers';

const CALENDAR_VIEW = '/wp-admin/edit.php?post_type=soli_event&page=soli_event_admin_view';

type Row = { id: number | string; start_date: string };

const day = (row: Row) => new Date(row.start_date.replace(' ', 'T'));

// 60 weekly dates: 30 before today, 30 after. Grote zaal, because the Calendar View starts on
// "music centre only".
function weekly() {
    const today = new Date();
    return Array.from({ length: 60 }, (_, i) => {
        const d = format(addDays(today, 7 * (i - 30) + (i < 30 ? 0 : 7)), 'yyyy-MM-dd');
        return { start_date: `${d} 12:00:00`, end_date: `${d} 13:00:00`, status: 'PUBLIC', is_concert: false, notes: '', rooms: '[0]' };
    });
}

async function createEvent(requestUtils: any, title: string) {
    const post = await requestUtils.rest({
        method: 'POST',
        path: '/wp/v2/soli_event',
        data: {
            title,
            status: 'publish',
            content: '<!-- wp:soli/create-event /-->',
            meta: { soli_event_dates: JSON.stringify(weekly()) },
        },
    });
    const rows: Row[] = await requestUtils.rest({ path: `/soli_event/v1/events/${post.id}` });
    return { postId: post.id as number, rows: [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date)) };
}

async function visibleIds(canvas: Page | FrameLocator) {
    return canvas
        .locator('.date-list-item')
        .evaluateAll((rows) => rows.map((row) => (row as HTMLElement).dataset.dateId ?? ''));
}

test.describe('Calendar View edit link', () => {
    const created: number[] = [];

    test.afterAll(async ({ requestUtils }) => {
        for (const id of created) {
            await requestUtils.rest({ method: 'DELETE', path: `/wp/v2/soli_event/${id}`, params: { force: true } });
        }
    });

    test('REST /events says who may edit each date', async ({ requestUtils }) => {
        const title = uniqueTitle('Edit link REST');
        const { postId, rows } = await createEvent(requestUtils, title);
        created.push(postId);
        const target = day(rows[40]);
        const path = `/wp-json/soli_event/v1/events?start_date=${format(target, 'yyyy-MM-dd')}&end_date=${format(addDays(target, 1), 'yyyy-MM-dd')}`;

        const canEdit = async (role: Parameters<typeof apiFor>[0]) => {
            const api = await apiFor(role);
            const body = (await (await api.get(`${BASE_URL}${path}`)).json()) as any[];
            await api.dispose();
            return body.find((r) => String(r.id) === String(rows[40].id))?.can_edit;
        };

        expect(await canEdit('admin')).toBe(true);
        expect(await canEdit('editor')).toBe(true);
        // An author may not edit an event someone else wrote.
        expect(await canEdit('author')).toBe(false);
        expect(await canEdit('anonymous')).toBe(false);
    });

    test('the popup links to the editor, which opens on that date', async ({ page, requestUtils }) => {
        const title = uniqueTitle('Edit link');
        const { postId, rows } = await createEvent(requestUtils, title);
        created.push(postId);
        // A month whose dates all lie at least five weeks back, so none is on the editor's default page.
        const month = day(rows[25]);

        await page.goto(CALENDAR_VIEW);
        await page.locator('.soli-cal-button-dayGridMonth').click();
        const months = differenceInCalendarMonths(month, new Date());
        for (let i = 0; i < Math.abs(months); i++) {
            await page.locator('.soli-cal-button-prev').click();
        }
        await page.getByText(title).first().click();

        const popup = page.getByRole('dialog', { name: title });
        const edit = popup.getByRole('link', { name: 'Edit', exact: true });
        await expect(edit).toBeVisible();
        const href = new URL((await edit.getAttribute('href')) as string);
        expect(href.pathname).toMatch(/\/wp-admin\/post\.php$/);
        expect(href.searchParams.get('post')).toBe(String(postId));
        expect(href.searchParams.get('action')).toBe('edit');
        const index = rows.findIndex((r) => String(r.id) === href.searchParams.get('soli_event_date'));
        expect(index, href.toString()).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(30);
        const target = rows[index];
        const targetDay = day(target);

        await edit.click();
        const canvas = await editorCanvas(page);
        const row = canvas.locator(`.date-list-item[data-date-id="${target.id}"]`);
        await expect(row).toBeVisible({ timeout: BLOCK_LOAD_TIMEOUT });
        await expect(row).toHaveClass(/highlighted/);
        expect(await visibleIds(canvas)).toEqual(rows.slice(index, index + 20).map((r) => String(r.id)));
        // The picker reads "D MMMM, YYYY" in Dutch; day and year are locale-independent.
        const goTo = await canvas.locator('.date-list-goto input').inputValue();
        expect(goTo.startsWith(`${format(targetDay, 'd')} `)).toBe(true);
        expect(goTo).toContain(format(targetDay, 'yyyy'));
    });

    test('an unknown date id falls back to the next upcoming date', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await createEvent(requestUtils, uniqueTitle('Edit link stale'));
        created.push(postId);

        await admin.visitAdminPage('post.php', `post=${postId}&action=edit&soli_event_date=999999999`);
        const canvas = await editorCanvas(page);
        await canvas.locator('.date-list-item').first().waitFor({ timeout: BLOCK_LOAD_TIMEOUT });
        expect(await visibleIds(canvas)).toEqual(rows.slice(30, 50).map((r) => String(r.id)));
        await expect(canvas.locator('.date-list-item.highlighted')).toHaveCount(0);
    });
});
