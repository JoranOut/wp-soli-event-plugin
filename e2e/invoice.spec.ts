/**
 * "Invoice this event" (create-event block).
 *
 * The editor header and the document sidebar both offer an invoice button that
 * opens a dialog with a date-range filter and the event's dates pre-selected.
 * Generating downloads a .docx whose single table carries the dates, hours and
 * amounts plus the rate/VAT/total rows, wired together with same-table cell
 * reference fields (=D2*E7) so changing the rate in Word and pressing F9
 * recalculates every amount.
 *
 * The event keeps its dates in workflow states (OPTION / PLANNED) on purpose:
 * those never reach public surfaces, so concurrent specs asserting public feeds
 * are unaffected.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { addDays } from 'date-fns';
import { apiFor } from './fixtures/roles';
import { createSingleEvent, uniqueTitle, BLOCK_LOAD_TIMEOUT } from './helpers';
import { readZipEntry } from './docx-utils';

const EXTRA_DATE = { start: '2030-01-05 20:00:00', end: '2030-01-05 22:00:00' };

// Add a second (2030) date to the event through the REST write path, keeping
// the rows the editor already saved.
async function addExtraDate(postId: number) {
    const api = await apiFor('admin');
    const current = await api.get(`/wp-json/soli_event/v1/events/${postId}`);
    expect(current.ok()).toBeTruthy();
    const rows = (await current.json()) as any[];
    const body = [
        ...rows.map((row) => ({
            id: row.id,
            start_date: row.start_date,
            end_date: row.end_date,
            location: row.location_id ?? null,
            rooms: row.rooms ?? null,
            status: row.status,
            is_concert: !!row.is_concert,
            notes: row.notes ?? '',
        })),
        {
            start_date: EXTRA_DATE.start,
            end_date: EXTRA_DATE.end,
            status: 'PLANNED',
            is_concert: false,
            notes: '',
        },
    ];
    const res = await api.post(`/wp-json/soli_event/v1/events/${postId}`, { data: body });
    expect(res.ok()).toBeTruthy();
    await api.dispose();
}

test.describe('Invoice this event (create-event block)', () => {
    test('pre-selects all dates, honours unchecks and generates a .docx with rate formulas', async ({ admin, page }) => {
        const title = uniqueTitle('Invoice Target');
        // 12:00-14:30 -> 2,50 hours; the seeded 2030 date adds 2,00 hours.
        await createSingleEvent(
            { admin, page },
            { title, date: addDays(new Date(), 7), startTime: '12:00', endTime: '14:30', keepDefaultStatus: true }
        );

        const postId = Number(new URL(page.url()).searchParams.get('post'));
        expect(postId).toBeGreaterThan(0);
        await addExtraDate(postId);

        await admin.visitAdminPage(`post.php?post=${postId}&action=edit`);
        const invoiceButton = page.locator('.editor-header').getByRole('button', { name: 'Invoice this event' });
        await invoiceButton.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });

        const modal = page.locator('.invoice-event-modal');

        // The document sidebar carries the same trigger: the button in its
        // "Invoice" panel opens the very same dialog. Both the sidebar and the
        // panel remember their open state per user, and that user is shared
        // with every other spec, so open each only when it is actually closed.
        const panel = page.locator('.invoice-document-panel');
        if ((await panel.count()) === 0) {
            await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
            await panel.waitFor({ state: 'attached', timeout: BLOCK_LOAD_TIMEOUT });
        }
        const sidebarTrigger = panel.getByRole('button', { name: 'Invoice this event' });
        if (!(await sidebarTrigger.isVisible())) {
            await panel.getByRole('button', { name: 'Invoice', exact: true }).click();
        }
        await sidebarTrigger.click();
        await expect(modal).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden();

        await invoiceButton.click();
        await expect(modal).toBeVisible();

        // Both dates listed, all pre-selected, with their durations.
        const dateRows = modal.locator('.invoice-date-row');
        await expect(dateRows).toHaveCount(2);
        await expect(modal.getByRole('checkbox').first()).toBeChecked();
        await expect(modal.getByRole('checkbox').nth(1)).toBeChecked();
        await expect(modal.getByText('2,50 hours')).toBeVisible();
        await expect(modal.getByText('2,00 hours')).toBeVisible();
        await expect(modal.getByText('2 dates selected')).toBeVisible();

        // Unselect the seeded 2030 date and set an hourly rate of 50.
        await dateRows.filter({ hasText: '05-01-2030' }).getByRole('checkbox').uncheck();
        await expect(modal.getByText('1 date selected')).toBeVisible();
        await modal.getByLabel('Hourly rate (€)').fill('50');

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            modal.getByRole('button', { name: 'Download invoice' }).click(),
        ]);
        expect(download.suggestedFilename()).toMatch(/^invoice-.+\.docx$/);

        const filePath = await download.path();
        const buf = require('fs').readFileSync(filePath!);
        const xml = readZipEntry(buf, 'word/document.xml');
        expect(xml).not.toBeNull();

        // Invoice basics: the usual header fields, the subject and the totals.
        expect(xml).toContain(title);
        expect(xml).toContain('Invoice number');
        expect(xml).toContain('Due date');
        expect(xml).toContain('Subject');
        expect(xml).toContain('Subtotal');
        expect(xml).toContain('2,50');
        expect(xml).toContain('125,00'); // 2,50 h x € 50
        // The unchecked 2030 date is excluded.
        expect(xml).not.toContain('2030');

        // Editable-rate mechanics. Only same-table cell references recalculate
        // reliably, so the amount multiplies the hours cell by the rate cell,
        // and the totals never reference a cell that itself holds a field.
        expect(xml).toMatch(/=D2\*E\d+/);
        expect(xml).toMatch(/=SUM\(D2:D2\)\*E\d+/);
        expect(xml).not.toContain('SUM(ABOVE)');
        expect(xml).not.toContain('bookmarkStart');
        // Explicit twip widths - percentage widths collapse the table in Word.
        expect(xml).toContain('w:type="dxa"');

        // The dialog closes after a successful download.
        await expect(modal).toBeHidden();
    });

    test('date-range filter narrows the pre-selected list', async ({ admin, page }) => {
        const title = uniqueTitle('Invoice Range');
        await createSingleEvent(
            { admin, page },
            { title, date: addDays(new Date(), 7), startTime: '12:00', endTime: '14:30', keepDefaultStatus: true }
        );

        const postId = Number(new URL(page.url()).searchParams.get('post'));
        await addExtraDate(postId);

        await admin.visitAdminPage(`post.php?post=${postId}&action=edit`);
        const invoiceButton = page.locator('.editor-header').getByRole('button', { name: 'Invoice this event' });
        await invoiceButton.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
        await invoiceButton.click();

        const modal = page.locator('.invoice-event-modal');
        await expect(modal.locator('.invoice-date-row')).toHaveCount(2);

        // Move "From" past the first date: only the 2030 date remains listed.
        const fromInput = modal.getByRole('textbox').first();
        await fromInput.click();
        await fromInput.press('ArrowLeft');
        await fromInput.press('ArrowLeft');
        await fromInput.press('ArrowLeft');
        await page.keyboard.type('01', { delay: 100 });
        await page.keyboard.type('01', { delay: 100 });
        await page.keyboard.type('2030', { delay: 100 });

        await expect(modal.locator('.invoice-date-row')).toHaveCount(1);
        await expect(modal.locator('.invoice-date-row')).toContainText('05-01-2030');
        await expect(modal.getByText('1 date selected')).toBeVisible();
    });
});
