/**
 * event-view-calendar block (S2) + REST /events between dates (R1).
 *
 * The matrix is asserted authoritatively at the API layer (R1); a light DOM
 * smoke confirms the block renders that feed. Calendar shows any date IN RANGE
 * (past included), unlike the future-only list.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { addDays, format } from 'date-fns';
import { createCalendarPage } from './helpers';
import { apiFor, pageFor, ALL_ROLES } from './fixtures/roles';
import { calendarMatrix, title, type CatalogueKey, type Role } from './fixtures/catalogue';

const KEYS = Object.keys(calendarMatrix) as CatalogueKey[];
const range = () => ({
    start_date: format(addDays(new Date(), -40), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 40), 'yyyy-MM-dd'),
});

test.describe('REST /events (between dates) — calendar feed (R1)', () => {
    for (const role of ALL_ROLES) {
        test(`obeys the calendar matrix for ${role}`, async () => {
            const api = await apiFor(role);
            const { start_date, end_date } = range();
            const res = await api.get(
                `/wp-json/soli_event/v1/events?start_date=${start_date}&end_date=${end_date}`
            );
            // 204 (no content) would mean nothing matched — always have publics.
            expect(res.status()).toBe(200);
            const rows = (await res.json()) as Array<{ post_title: string }>;
            const titles = rows.map((r) => r.post_title);

            for (const key of KEYS) {
                const expected = calendarMatrix[key][role as Role];
                const present = titles.includes(title(key));
                expect(
                    present,
                    `${title(key)} should be ${expected === 'full' ? 'present' : 'absent'} for ${role}`
                ).toBe(expected === 'full');
            }

            // PRIVATE dates surface anonymised (never dropped) for not-logged-in.
            if (role === 'anonymous') {
                expect(titles).toContain('private');
            }
            await api.dispose();
        });
    }
});

test.describe('event-view-calendar block (S2) — DOM smoke', () => {
    test('renders the calendar with event(s) for an anonymous visitor', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        await createCalendarPage({ admin, page, editor });
        const permalink = page.url();

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.goto(permalink);
        await expect(anon.locator('.fc, .block-event-view-calendar').first()).toBeVisible({
            timeout: 30000,
        });
        // At least one event pill is rendered (fullcalendar event or a "more" link).
        await expect(
            anon.locator('.soli-cal-event, .soli-cal-more-link').first()
        ).toBeVisible({ timeout: 30000 });
        await context.close();
    });
});

test.describe('event-view-calendar block — phone width', () => {
    test('shows a month list whose events link straight to the event page', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        await createCalendarPage({ admin, page, editor });
        const permalink = page.url();

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.setViewportSize({ width: 390, height: 844 });
        await anon.goto(permalink);

        const listEvent = anon.locator('.soli-cal-list-event').first();
        await expect(listEvent).toBeVisible({ timeout: 30000 });
        await expect(anon.locator('.soli-cal-day')).toHaveCount(0);

        // The view switcher is never offered on a phone; prev/today/next are.
        await expect(anon.locator('.soli-cal-button-prev')).toBeVisible();
        await expect(anon.locator('.soli-cal-button-today')).toBeVisible();
        await expect(anon.locator('.soli-cal-button-next')).toBeVisible();
        await expect(anon.locator('.soli-cal-button-dayGridMonth')).toHaveCount(0);

        const href = await listEvent.getAttribute('href');
        expect(href).toContain('/evenement/');
        await listEvent.click();
        await anon.waitForURL((url) => url.href === href);
        await expect(anon.locator('.event-detail-popup')).toHaveCount(0);
        await context.close();
    });

    test('returns to the month grid with popup when widened', async ({
        admin,
        page,
        editor,
        browser,
    }) => {
        await createCalendarPage({ admin, page, editor });
        const permalink = page.url();

        const { context, page: anon } = await pageFor(browser, 'anonymous');
        await anon.setViewportSize({ width: 390, height: 844 });
        await anon.goto(permalink);
        await expect(anon.locator('.soli-cal-list-event').first()).toBeVisible({ timeout: 30000 });

        await anon.setViewportSize({ width: 1280, height: 900 });
        await expect(anon.locator('.soli-cal-day').first()).toBeVisible();
        await anon.locator('.soli-cal-row-event').first().click();
        await expect(anon.locator('.event-detail-popup')).toBeVisible();
        await context.close();
    });
});
