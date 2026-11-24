/**
 * Create-event block with many dates: the list shows 20 dates at a time, starting at the next
 * upcoming one, with "show earlier/later", "go to date", "upcoming" and "show all". Edits, copies
 * and deletes must save correctly, including for dates that are not on screen.
 *
 * Dates use the workflow status OPTION, so concurrent public-feed specs are unaffected.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import type { FrameLocator, Locator, Page } from '@playwright/test';
import { addDays, differenceInCalendarMonths, format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { BLOCK_LOAD_TIMEOUT, editorCanvas, typeInPickerField, uniqueTitle } from './helpers';

const PAGE = 20;

type Row = { id: number; start_date: string; end_date: string; status: string; notes: string | null };

const at = (day: Date, time: string) => `${format(day, 'yyyy-MM-dd')} ${time}`;

// Weekly dates at 19:00-21:00: `past` of them before today, `future` after.
function weekly(past: number, future: number) {
    const today = new Date();
    const days = [
        ...Array.from({ length: past }, (_, i) => addDays(today, -7 * (past - i))),
        ...Array.from({ length: future }, (_, i) => addDays(today, 7 * (i + 1))),
    ];
    return days.map((day) => ({
        start_date: at(day, '19:00:00'),
        end_date: at(day, '21:00:00'),
        status: 'OPTION',
        is_concert: false,
        notes: '',
        rooms: null,
    }));
}

async function createEvent(requestUtils: any, dates: object[]) {
    const post = await requestUtils.rest({
        method: 'POST',
        path: '/wp/v2/soli_event',
        data: {
            title: uniqueTitle('Many dates'),
            status: 'publish',
            content: '<!-- wp:soli/create-event /-->',
            meta: { soli_event_dates: JSON.stringify(dates) },
        },
    });
    return post.id as number;
}

async function storedRows(requestUtils: any, postId: number): Promise<Row[]> {
    const rows: Row[] = await requestUtils.rest({ path: `/soli_event/v1/events/${postId}` });
    return [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id - b.id);
}

async function openEditor(admin: any, page: Page, postId: number) {
    await admin.editPost(postId);
    const canvas = await editorCanvas(page);
    await canvas.locator('.date-list-item').first().waitFor({ timeout: BLOCK_LOAD_TIMEOUT });
    return canvas;
}

async function visibleIds(canvas: Page | FrameLocator) {
    return canvas
        .locator('.date-list-item')
        .evaluateAll((rows) => rows.map((row) => (row as HTMLElement).dataset.dateId ?? ''));
}

const idsOf = (rows: Row[]) => rows.map((r) => String(r.id));

// The fields a save may change. The editor writes an empty note back as null, so compare that loosely.
const persisted = (rows: Row[]) =>
    rows.map(({ id, start_date, end_date, status, notes }) => ({ id, start_date, end_date, status, notes: notes || null }));

const day = (row: Row) => new Date(row.start_date.replace(' ', 'T'));

// Types a day into the "Go to date" picker (D MMMM, YYYY: digits fill day, month and year in turn).
async function goTo(canvas: Page | FrameLocator, date: Date) {
    await typeInPickerField(canvas.locator('.date-list-goto'), format(date, 'ddMMyyyy'));
}

async function save(page: Page) {
    await page.locator('.editor-header__settings').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.components-snackbar').first()).toBeVisible({ timeout: 15000 });
}

async function setStatus(canvas: Page | FrameLocator, row: Locator, status: string) {
    await row.locator('.event-status-selector').getByRole('combobox').click();
    await canvas.getByRole('option', { name: status, exact: true }).click();
}

// Picks a day from the row's start-date calendar. The popup opens on the field's own month.
async function pickStartDay(canvas: Page | FrameLocator, row: Locator, from: Date, to: Date) {
    await row.locator('div.start-date').getByRole('button').first().click();
    const dialog = canvas.getByRole('dialog');
    const months = differenceInCalendarMonths(to, from);
    for (let i = 0; i < Math.abs(months); i++) {
        await dialog.getByRole('button', { name: months < 0 ? 'Previous month' : 'Next month' }).click();
    }
    await dialog
        .getByRole('gridcell', { name: format(to, 'd', { locale: enUS }), exact: true })
        .first()
        .click();
    await expect(dialog).toBeHidden();
}

test.describe('Create-event block with many dates', () => {
    const created: number[] = [];

    test.afterAll(async ({ requestUtils }) => {
        for (const id of created) {
            await requestUtils.rest({ method: 'DELETE', path: `/wp/v2/soli_event/${id}`, params: { force: true } });
        }
    });

    async function seed(requestUtils: any, past: number, future: number) {
        const postId = await createEvent(requestUtils, weekly(past, future));
        created.push(postId);
        return { postId, rows: await storedRows(requestUtils, postId) };
    }

    test('opens on the next 20 upcoming dates', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 40, 60);
        const canvas = await openEditor(admin, page, postId);

        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(40, 60)));
        await expect(canvas.locator('.date-list-range')).toHaveText('Dates 41–60 of 100');
        await expect(canvas.locator('.date-list-more-earlier')).toContainText('40 hidden');
        await expect(canvas.locator('.date-list-more-later')).toContainText('40 hidden');
        // Only the shown rows mount their date pickers.
        await expect(canvas.locator('.date-list-item .date-range-picker')).toHaveCount(PAGE);
    });

    test('show earlier, show later and show all page through every date', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 40, 60);
        const canvas = await openEditor(admin, page, postId);

        await canvas.getByRole('button', { name: 'Show 20 later dates' }).click();
        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(40, 80)));
        await canvas.getByRole('button', { name: 'Show 20 later dates' }).click();
        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(40, 100)));
        await expect(canvas.locator('.date-list-more-later')).toHaveCount(0);

        await canvas.getByRole('button', { name: 'Show 20 earlier dates' }).click();
        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(20, 100)));
        await canvas.getByRole('button', { name: 'Show 20 earlier dates' }).click();
        expect(await visibleIds(canvas)).toEqual(idsOf(rows));
        await expect(canvas.locator('.date-list-more-earlier')).toHaveCount(0);

        await canvas.getByRole('button', { name: 'Upcoming' }).click();
        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(40, 60)));

        await canvas.getByRole('button', { name: 'Show all' }).click();
        expect(await visibleIds(canvas)).toEqual(idsOf(rows));
    });

    test('go to date jumps to the first date on or after it', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 40, 60);
        const canvas = await openEditor(admin, page, postId);

        // A day between two dates lands on the later one.
        await goTo(canvas, addDays(day(rows[10]), -3));
        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(10, 30)));
        await expect(canvas.locator('.date-list-more-earlier')).toContainText('10 hidden');

        await goTo(canvas, day(rows[75]));
        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(75, 95)));

        // Past the last date: the last page.
        await goTo(canvas, addDays(new Date(), 7 * 100));
        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(80, 100)));
    });

    test('a short list shows every date without paging', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 3, 2);
        const canvas = await openEditor(admin, page, postId);

        expect(await visibleIds(canvas)).toEqual(idsOf(rows));
        await expect(canvas.locator('.date-list-tools')).toHaveCount(0);
        await expect(canvas.locator('.date-list-more')).toHaveCount(0);
    });

    test('an event with only past dates opens on its last 20', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 30, 0);
        const canvas = await openEditor(admin, page, postId);

        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(10, 30)));
        await expect(canvas.locator('.date-list-more-later')).toHaveCount(0);
    });

    test('editing a shown date saves it and leaves the hidden dates untouched', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 40, 60);
        const canvas = await openEditor(admin, page, postId);
        const target = rows[45];

        await setStatus(canvas, canvas.locator(`.date-list-item[data-date-id="${target.id}"]`), 'PENDING_APPROVAL');
        await save(page);

        await expect
            .poll(async () => (await storedRows(requestUtils, postId)).find((r) => r.id === target.id)?.status)
            .toBe('PENDING_APPROVAL');
        const after = await storedRows(requestUtils, postId);
        expect(after).toHaveLength(100);
        const untouched = (list: Row[]) => list.filter((r) => r.id !== target.id);
        expect(persisted(untouched(after))).toEqual(persisted(untouched(rows)));
    });

    test('a date revealed with show later can be edited and saved', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 40, 60);
        const canvas = await openEditor(admin, page, postId);
        const target = rows[95];

        await expect(canvas.locator(`.date-list-item[data-date-id="${target.id}"]`)).toHaveCount(0);
        await goTo(canvas, day(target));
        await setStatus(canvas, canvas.locator(`.date-list-item[data-date-id="${target.id}"]`), 'PENDING_APPROVAL');
        await save(page);

        await expect
            .poll(async () => (await storedRows(requestUtils, postId)).find((r) => r.id === target.id)?.status)
            .toBe('PENDING_APPROVAL');
        expect(await storedRows(requestUtils, postId)).toHaveLength(100);
    });

    test('deleting a shown date removes only that date', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 40, 60);
        const canvas = await openEditor(admin, page, postId);
        const target = rows[50];

        await canvas.locator(`.date-list-item[data-date-id="${target.id}"] .delete-button`).click();
        // The next date moves up into the window.
        expect(await visibleIds(canvas)).toEqual(idsOf([...rows.slice(40, 50), ...rows.slice(51, 61)]));
        await expect(canvas.locator('.date-list-range')).toHaveText('Dates 41–60 of 99');
        await save(page);

        await expect.poll(async () => (await storedRows(requestUtils, postId)).length).toBe(99);
        expect(persisted(await storedRows(requestUtils, postId))).toEqual(persisted(rows.filter((r) => r.id !== target.id)));
    });

    test('undo brings a deleted date back', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 40, 60);
        const canvas = await openEditor(admin, page, postId);

        await canvas.locator(`.date-list-item[data-date-id="${rows[42].id}"] .delete-button`).click();
        await expect(canvas.locator('.date-list-range')).toHaveText('Dates 41–60 of 99');
        await canvas.getByRole('button', { name: 'undo' }).click();
        await expect(canvas.locator('.date-list-range')).toHaveText(/of 100$/);
        expect(await visibleIds(canvas)).toContain(String(rows[42].id));
    });

    test('copying a shown date adds it next to its source and saves it', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 40, 60);
        const canvas = await openEditor(admin, page, postId);
        const source = rows[44];

        await canvas.locator(`.date-list-item[data-date-id="${source.id}"] .copy-button button`).click();
        // The window grows by one, so the last shown date stays on screen.
        const shown = await visibleIds(canvas);
        expect(shown).toHaveLength(PAGE + 1);
        expect(shown[shown.indexOf(String(source.id)) + 1]).toBe('');
        expect(shown.at(-1)).toBe(String(rows[59].id));
        await save(page);

        await expect.poll(async () => (await storedRows(requestUtils, postId)).length).toBe(101);
        const after = await storedRows(requestUtils, postId);
        expect(after.filter((r) => r.start_date === source.start_date)).toHaveLength(2);
        expect(persisted(after.filter((r) => rows.some((o) => o.id === r.id)))).toEqual(persisted(rows));
    });

    test('a date moved outside the window stays on screen while editing', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 40, 60);
        const canvas = await openEditor(admin, page, postId);
        const target = rows[40];
        const from = new Date(target.start_date.replace(' ', 'T'));
        const to = addDays(new Date(rows[99].start_date.replace(' ', 'T')), 10);

        await pickStartDay(canvas, canvas.locator(`.date-list-item[data-date-id="${target.id}"]`), from, to);

        // It now sorts last, beyond the window, and is kept as the last shown row below the
        // 20 dates that follow it.
        expect(await visibleIds(canvas)).toEqual([...idsOf(rows.slice(41, 61)), String(target.id)]);
        await expect(canvas.locator('.date-list-more-later')).toContainText('39 hidden');
        await save(page);

        await expect
            .poll(async () => (await storedRows(requestUtils, postId)).find((r) => r.id === target.id)?.start_date)
            .toBe(at(to, '19:00:00'));
        const after = await storedRows(requestUtils, postId);
        expect(after).toHaveLength(100);
        expect(after.at(-1)?.id).toBe(target.id);
    });

    test('three hundred dates still open on a 20-row page', async ({ admin, page, requestUtils }) => {
        const { postId, rows } = await seed(requestUtils, 100, 200);
        const canvas = await openEditor(admin, page, postId);

        expect(await visibleIds(canvas)).toEqual(idsOf(rows.slice(100, 120)));
        await expect(canvas.locator('.date-list-range')).toHaveText('Dates 101–120 of 300');
    });

    test('a date without a status the dropdown offers shows OPTION', async ({ admin, page, requestUtils }) => {
        // PLANNED is the table default; the dropdown has no entry for it or for an empty status.
        const dates = weekly(0, 3).map((d, i) => ({ ...d, status: ['PLANNED', '', 'PUBLIC'][i] }));
        const postId = await createEvent(requestUtils, dates);
        created.push(postId);
        const canvas = await openEditor(admin, page, postId);

        await expect(canvas.locator('.event-status-selector').getByRole('combobox')).toHaveText(['OPTION', 'OPTION', 'PUBLIC']);
    });
});
