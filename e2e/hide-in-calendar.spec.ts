/**
 * "Hide in calendar": an event flagged with soli_event_hide_in_calendar stays out of every
 * view of the calendar block, but still shows in the admin Calendar View.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { addDays, format } from 'date-fns';
import { createPageWithBlocks } from './helpers';
import { pageFor } from './fixtures/roles';

const HIDDEN = 'Hide-in-calendar rehearsal';
const SHOWN = 'Hide-in-calendar control';
const CALENDAR_VIEW = '/wp-admin/edit.php?post_type=soli_event&page=soli_event_admin_view';

const today = (time: string) => `${format(new Date(), 'yyyy-MM-dd')} ${time}`;

async function createEvent(requestUtils: any, title: string, hideInCalendar: boolean) {
    const dates = [
        {
            start_date: today('12:00:00'),
            end_date: today('13:00:00'),
            // Grote zaal: the admin Calendar View starts on "music centre only".
            rooms: '[0]',
            status: 'PUBLIC',
            is_concert: false,
            notes: '',
        },
    ];
    return requestUtils.rest({
        method: 'POST',
        path: '/wp/v2/soli_event',
        data: {
            title,
            status: 'publish',
            meta: {
                soli_event_hide_in_calendar: hideInCalendar,
                soli_event_dates: JSON.stringify(dates),
            },
        },
    });
}

test.describe('Hide in calendar', () => {
    const created: number[] = [];

    test.beforeAll(async ({ requestUtils }) => {
        created.push((await createEvent(requestUtils, HIDDEN, true)).id);
        created.push((await createEvent(requestUtils, SHOWN, false)).id);
    });

    test.afterAll(async ({ requestUtils }) => {
        for (const id of created) {
            await requestUtils.rest({
                method: 'DELETE',
                path: `/wp/v2/soli_event/${id}`,
                params: { force: true },
            });
        }
    });

    test('REST /events carries the flag', async ({ requestUtils }) => {
        const rows = await requestUtils.rest({
            path: '/soli_event/v1/events',
            params: {
                start_date: format(new Date(), 'yyyy-MM-dd'),
                end_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            },
        });
        const byTitle = (t: string) => rows.find((r: any) => r.post_title === t);
        expect(byTitle(HIDDEN).hide_in_calendar).toBe(true);
        expect(byTitle(SHOWN).hide_in_calendar).toBe(false);
    });

    test('month grid and phone list leave the event out', async ({ admin, page, editor, browser }) => {
        await createPageWithBlocks({ admin, page, editor }, ['soli/event-view-calendar'], 'Month calendar');
        const permalink = page.url();

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);
        // dayMaxEvents can fold today's pills into "+n more"; open it so both titles render.
        const more = anon.locator('.soli-cal-more-link').first();
        if (await more.isVisible({ timeout: 5000 }).catch(() => false)) {
            await more.click();
        }
        await expect(anon.getByText(SHOWN).first()).toBeVisible({ timeout: 30000 });
        await expect(anon.getByText(HIDDEN)).toHaveCount(0);

        await anon.setViewportSize({ width: 390, height: 844 });
        await expect(anon.locator('.soli-cal-list-event').getByText(SHOWN)).toBeVisible();
        await expect(anon.getByText(HIDDEN)).toHaveCount(0);
        await context.close();
    });

    test('week view leaves the event out', async ({ admin, page, editor, browser }) => {
        await createPageWithBlocks(
            { admin, page, editor },
            [{ name: 'soli/event-view-calendar', attributes: { calendar_type: 'week' } }],
            'Week calendar'
        );
        const permalink = page.url();

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);
        await expect(anon.getByText(SHOWN).first()).toBeVisible({ timeout: 30000 });
        await expect(anon.getByText(HIDDEN)).toHaveCount(0);
        await context.close();
    });

    test('admin Calendar View still shows it', async ({ page }) => {
        await page.goto(CALENDAR_VIEW);
        await page.locator('.soli-cal-button-dayGridMonth').click();
        const more = page.locator('.soli-cal-more-link').first();
        if (await more.isVisible({ timeout: 5000 }).catch(() => false)) {
            await more.click();
        }
        await expect(page.getByText(HIDDEN).first()).toBeVisible({ timeout: 30000 });
    });

    test('the editor checkbox saves the flag', async ({ admin, editor, page, requestUtils }) => {
        const post = await createEvent(requestUtils, 'Hide-in-calendar editor', false);
        created.push(post.id);

        await admin.editPost(post.id);
        await editor.openDocumentSettingsSidebar();
        const checkbox = page.getByRole('checkbox', { name: 'Hide in calendar' });
        if (!(await checkbox.isVisible())) {
            await page.getByRole('button', { name: 'Calendar', exact: true }).click();
        }
        await checkbox.check();
        await page.locator('.editor-header__settings').getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.locator('.components-snackbar').first()).toBeVisible({ timeout: 15000 });

        const saved = await requestUtils.rest({
            path: `/wp/v2/soli_event/${post.id}`,
            params: { context: 'edit' },
        });
        expect(saved.meta.soli_event_hide_in_calendar).toBe(true);
    });
});
