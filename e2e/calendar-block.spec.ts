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
            anon.locator('.fc-event, .fc-daygrid-event, .fc-daygrid-more-link').first()
        ).toBeVisible({ timeout: 30000 });
        await context.close();
    });
});
