/**
 * First-event wizard (create-event block).
 *
 * A brand-new event post opens a 4-step wizard (date/time -> location ->
 * details -> repeat) on top of the block. This spec walks the whole flow with
 * every field filled - including a bi-weekly repeat of 2 extra dates - and
 * locks that Finish writes the full result into the block and that saving
 * persists all rows to the event_dates table.
 *
 * The event is saved as a draft on purpose: its dates never reach public
 * surfaces, so concurrent specs asserting public feeds are unaffected.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { addDays, format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { uniqueTitle, BLOCK_LOAD_TIMEOUT } from './helpers';

test.describe('First-event wizard', () => {
    test.describe.configure({ mode: 'parallel' });

    test('walks all steps and persists the event with bi-weekly repeats', async ({ admin, page }) => {
        const title = uniqueTitle('Wizard Walkthrough');
        const note = uniqueTitle('Wizard note');
        const eventDate = addDays(new Date(), 1);

        await admin.createNewPost({ postType: 'soli_event' });

        const wizard = page.locator('.first-event-wizard');
        await wizard.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });

        // --- Step 1: date & time ---------------------------------------
        await expect(wizard.getByRole('heading', { name: 'When does it take place?' })).toBeVisible();

        // Enter the date into the MUI masked field (D MMMM, YYYY): land on the
        // leftmost (day) section and let section auto-advance carry across
        // day -> month -> year (same technique as createSingleEvent).
        const dateInput = wizard.getByRole('textbox', { name: 'DD MMMM, YYYY' }).first();
        await dateInput.click();
        await dateInput.press('ArrowLeft');
        await dateInput.press('ArrowLeft');
        await dateInput.press('ArrowLeft');
        await page.keyboard.type(format(eventDate, 'dd', { locale: enUS }), { delay: 100 });
        await page.keyboard.type(format(eventDate, 'MM', { locale: enUS }), { delay: 100 });
        await page.keyboard.type(format(eventDate, 'yyyy', { locale: enUS }), { delay: 100 });
        await dateInput.press('Tab');

        await wizard.getByRole('textbox', { name: 'hh:mm' }).first().fill('19:00');
        await wizard.getByRole('textbox', { name: 'hh:mm' }).nth(1).fill('21:30');

        await wizard.getByRole('button', { name: 'Next' }).click();

        // --- Step 2: location -------------------------------------------
        await expect(wizard.getByRole('heading', { name: 'Where does it take place?' })).toBeVisible();

        await wizard.getByRole('button', { name: 'Choose a location' }).click();
        await page.getByRole('checkbox', { name: 'Muziekcentrum' }).check();
        await page
            .locator('label')
            .filter({ hasText: 'Grote zaal' })
            .getByTestId('CheckBoxOutlineBlankIcon')
            .click();
        await page.getByRole('button', { name: 'Save', exact: true }).click();

        await wizard.getByRole('button', { name: 'Next' }).click();

        // --- Step 3: details --------------------------------------------
        await expect(wizard.getByRole('heading', { name: 'Details' })).toBeVisible();

        await wizard.getByRole('combobox', { name: 'OPTION' }).click();
        await page.getByRole('option', { name: 'PUBLIC' }).click();
        await wizard.locator('.concert-status-switch input[type="checkbox"]').check();
        await wizard.locator('.wizard-notes textarea').first().fill(note);

        await wizard.getByRole('button', { name: 'Next' }).click();

        // --- Step 4: repeat every other week, 2 times --------------------
        await expect(wizard.getByRole('heading', { name: 'Does it repeat?' })).toBeVisible();

        await wizard.locator('select').selectOption('BIWEEKLY');
        await wizard.getByRole('radio', { name: 'Number' }).check();
        await wizard.getByRole('spinbutton').fill('2');

        await expect(wizard.getByText('2 extra dates will be added:')).toBeVisible();
        await expect(wizard.locator('.wizard-generated li')).toHaveCount(2);

        await wizard.getByRole('button', { name: 'Finish' }).click();
        await expect(wizard).toBeHidden();

        // --- The block now shows all three dates with every field applied.
        const rows = page.locator('.date-list-item');
        await expect(rows).toHaveCount(3);
        await expect(page.locator('.date-list-item .concert-status-switch input:checked')).toHaveCount(3);
        await expect(page.getByRole('combobox', { name: 'PUBLIC' })).toHaveCount(3);
        await expect(rows.first()).toContainText(note);
        await expect(rows.first()).toContainText('Grote zaal');

        // --- Save as draft and verify the persisted rows ------------------
        await page.getByRole('textbox', { name: 'Add title' }).fill(title);
        await page.getByRole('button', { name: 'Save draft', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible({ timeout: BLOCK_LOAD_TIMEOUT });

        const persisted = await page.evaluate(async () => {
            const id = window.wp.data.select('core/editor').getCurrentPostId();
            return window.wp.apiFetch({ path: 'soli_event/v1/events/' + id });
        });

        const sorted = [...persisted].sort((a: any, b: any) => a.start_date.localeCompare(b.start_date));
        expect(sorted).toHaveLength(3);

        // One row per bi-weekly occurrence: +0, +14 and +28 days.
        [0, 14, 28].forEach((offset, i) => {
            const day = format(addDays(eventDate, offset), 'yyyy-MM-dd');
            expect(sorted[i].start_date).toContain(`${day} 19:00`);
            expect(sorted[i].end_date).toContain(`${day} 21:30`);
            expect(sorted[i].status).toBe('PUBLIC');
            expect(sorted[i].is_concert).toBe(true);
            // Location (the Grote zaal room) is inherited by the repeats.
            expect(sorted[i].rooms).toBeTruthy();
        });

        // The note stays on the first date only.
        expect(sorted[0].notes).toBe(note);
        expect(sorted[1].notes).toBeNull();
        expect(sorted[2].notes).toBeNull();
    });

    test('skip falls back to the inline editor with a default date', async ({ admin, page }) => {
        await admin.createNewPost({ postType: 'soli_event' });

        const wizard = page.locator('.first-event-wizard');
        await wizard.waitFor({ state: 'visible', timeout: BLOCK_LOAD_TIMEOUT });
        await wizard.getByRole('button', { name: 'Skip' }).click();
        await expect(wizard).toBeHidden();

        // The pre-wizard behaviour: the inline single-event editor with the
        // fabricated default date is still there, untouched.
        await expect(page.locator('.single-event')).toBeVisible();
        await expect(page.locator('.single-event .date-range-picker')).toBeVisible();
    });
});
