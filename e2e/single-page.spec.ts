/**
 * Single event page visibility (S6) + event-dates block (S5 / F1).
 *
 * Policy:
 *   - A not-logged-in visitor opening a PRIVATE-only event (no PUBLIC date)
 *     must get HTTP 403; logged-in users may view it.
 *   - The event-dates block lists a recurrence's dates filtered by viewer:
 *     PUBLIC always, PRIVATE for everyone (date/time only), PLANNED/PENDING
 *     only for editors.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { pageFor } from './fixtures/roles';
import { slug, eventDatesMixed, type Role } from './fixtures/catalogue';

const url = (key: string) => `/evenement/${slug(key as any)}/`;

test.describe('Single event page — PRIVATE-only 403 (S6)', () => {
    test('anonymous gets 403 on a PRIVATE-only event', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'anonymous');
        const res = await page.goto(url('private-only'));
        expect(res?.status()).toBe(403);
        await context.close();
    });

    test('subscriber may view a PRIVATE-only event', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'subscriber');
        const res = await page.goto(url('private-only'));
        expect(res?.status()).toBe(200);
        await context.close();
    });

    test('anonymous may view a normal public event', async ({ browser }) => {
        const { context, page } = await pageFor(browser, 'anonymous');
        const res = await page.goto(url('post-publish'));
        expect(res?.status()).toBe(200);
        await context.close();
    });

    // TODO (policy nuance): no-public-date (only PLANNED) single page for anon
    // — likely also 403 under a "needs a public date" rule. Left unasserted
    // until confirmed.
});

test.describe('event-dates block — per-viewer recurrence (S5/F1)', () => {
    const roles: Role[] = ['anonymous', 'subscriber', 'editor', 'admin'];
    for (const role of roles) {
        test(`shows the right rows for ${role}`, async ({ browser }) => {
            const { context, page } = await pageFor(browser, role);
            const res = await page.goto(url('recurring-mixed'));
            expect(res?.status()).toBe(200);

            const rows = page.locator('.soli-event-dates__list li');
            await expect(rows).toHaveCount(eventDatesMixed[role].visible);

            await context.close();
        });
    }
});
