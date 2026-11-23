/**
 * Cancellation link: an event's secret ?token= lets someone without an account cancel and restore
 * its dates on the page holding the soli/event-cancel-dates block.
 *
 * Dates use workflow statuses (PLANNED / OPTION) so concurrent public-feed specs are unaffected.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { apiFor, pageFor } from './fixtures/roles';
import { uniqueTitle } from './helpers';
import { readZipEntry } from './docx-utils';

const FUTURE = { start_date: '2031-03-04 19:00:00', end_date: '2031-03-04 21:30:00', status: 'PLANNED' };
const FUTURE_2 = { start_date: '2031-03-11 19:00:00', end_date: '2031-03-11 21:00:00', status: 'OPTION' };
const BY_SOLI = { start_date: '2031-04-01 19:00:00', end_date: '2031-04-01 21:00:00', status: 'CANCELLED' };
const PAST = { start_date: '2020-02-03 10:00:00', end_date: '2020-02-03 11:00:00', status: 'PLANNED' };

const date = (d: typeof FUTURE) => ({ ...d, is_concert: false, notes: '', rooms: null });

async function createEvent(requestUtils: any, title: string, dates = [FUTURE, FUTURE_2, BY_SOLI, PAST]) {
    const post = await requestUtils.rest({
        method: 'POST',
        path: '/wp/v2/soli_event',
        data: {
            title,
            status: 'publish',
            // The invoice button lives inside the create-event block.
            content: '<!-- wp:soli/create-event /-->',
            meta: { soli_event_dates: JSON.stringify(dates.map(date)) },
        },
    });
    return post.id as number;
}

async function rows(postId: number) {
    const admin = await apiFor('admin');
    const res = await admin.get(`/wp-json/soli_event/v1/events/${postId}`);
    const body = (await res.json()) as any[];
    await admin.dispose();
    return body;
}

const rowAt = (all: any[], start: string) => all.find((r) => r.start_date === start);

async function setLink(postId: number, action: 'enable' | 'rotate' | 'disable') {
    const admin = await apiFor('admin');
    const res = await admin.post(`/wp-json/soli_event/v1/cancel-link/${postId}`, { data: { action } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    await admin.dispose();
    return body as { enabled: boolean; url: string; has_page: boolean };
}

const tokenOf = (url: string) => new URL(url).searchParams.get('token')!;

async function toggle(token: string, dateIds: number | number[], cancelled: boolean) {
    const anon = await apiFor('anonymous');
    const date_ids = Array.isArray(dateIds) ? dateIds : [dateIds];
    const res = await anon.post('/wp-json/soli_event/v1/cancel', { data: { token, date_ids, cancelled } });
    const body = await res.json().catch(() => ({}));
    await anon.dispose();
    return { status: res.status(), body };
}

test.describe('Cancellation link', () => {
    const created: { type: string; id: number }[] = [];

    test.beforeAll(async ({ requestUtils }) => {
        const page = await requestUtils.rest({
            method: 'POST',
            path: '/wp/v2/pages',
            data: { title: 'Cancel dates', status: 'publish', content: '<!-- wp:soli/event-cancel-dates /-->' },
        });
        created.push({ type: 'pages', id: page.id });
    });

    test.afterAll(async ({ requestUtils }) => {
        for (const { type, id } of created) {
            await requestUtils.rest({ method: 'DELETE', path: `/wp/v2/${type}/${id}`, params: { force: true } });
        }
    });

    test('the link holder cancels and restores dates per month', async ({ requestUtils, browser }) => {
        const title = uniqueTitle('Cancel link visitor');
        const postId = await createEvent(requestUtils, title);
        created.push({ type: 'soli_event', id: postId });
        const link = await setLink(postId, 'enable');
        expect(link.enabled).toBe(true);
        expect(link.url).toMatch(/[?&]token=[0-9a-f-]{36}$/);

        const { context, page } = await pageFor(browser, 'anonymous');
        const response = await page.goto(link.url);
        // The secret is in the URL: no caching, no indexing, no Referer.
        const headers = response!.headers();
        expect(headers['referrer-policy']).toBe('no-referrer');
        expect(headers['x-robots-tag']).toContain('noindex');
        expect(headers['cache-control']).toContain('no-store');

        const block = page.locator('.soli-cancel-dates');
        await expect(block.getByRole('heading', { name: title })).toBeVisible();
        const summary = block.locator('.soli-cancel-dates__summary');

        // Opens on the first month from now with dates. Only weekdays the event uses get a column:
        // Monday (the past date) and Tuesday.
        await expect(block.getByRole('heading', { name: 'March 2031' })).toBeVisible();
        await expect(block.getByRole('columnheader')).toHaveCount(2);
        await expect(summary).toHaveText('2 of 2 dates go ahead · 4.5 hours');

        const chip = block.getByRole('button', { name: 'Cancel Tue 4 Mar 19:00–21:30', exact: true });
        await chip.click();
        const undo = block.getByRole('button', { name: 'Undo cancellation of Tue 4 Mar 19:00–21:30' });
        await expect(undo).toHaveClass(/is-cancelled/);
        await expect(summary).toHaveText('1 of 2 dates go ahead · 2 hours');
        await expect(block.locator('.soli-cancel-dates__status')).toHaveText('Tue 4 Mar 19:00–21:30 is cancelled.');

        let stored = rowAt(await rows(postId), FUTURE.start_date);
        expect(stored.status).toBe('CANCELLED');
        expect(stored.cancelled_externally).toBe(true);

        // A date Soli cancelled is shown but cannot be restored through the link.
        await block.getByRole('button', { name: 'Next Month' }).click();
        await expect(block.getByRole('heading', { name: 'April 2031' })).toBeVisible();
        await expect(block.locator('.soli-event.is-locked')).toHaveCount(1);
        await expect(block.locator('button.soli-cancel-dates__chip, .soli-cancel-dates__day-toggle')).toHaveCount(0);
        // The calendar stops at the event's last month.
        await expect(block.getByRole('button', { name: 'Next Month' })).toBeDisabled();

        // Survives a reload, then restore puts the original status back.
        await page.reload();
        const again = page.getByRole('button', { name: 'Undo cancellation of Tue 4 Mar 19:00–21:30' });
        await expect(again).toHaveClass(/is-cancelled/);
        await again.click();
        await expect(page.getByRole('button', { name: 'Cancel Tue 4 Mar 19:00–21:30', exact: true })).not.toHaveClass(/is-cancelled/);
        stored = rowAt(await rows(postId), FUTURE.start_date);
        expect(stored.status).toBe('PLANNED');
        expect(stored.cancelled_externally).toBe(false);

        await context.close();
    });

    test('a whole day is cancelled and restored in one go, around a date Soli cancelled', async ({ requestUtils, browser }) => {
        const day = (from: string, until: string, status: string) =>
            ({ start_date: `2031-05-06 ${from}:00`, end_date: `2031-05-06 ${until}:00`, status });
        const dates = [day('09:00', '10:00', 'PLANNED'), day('10:00', '11:00', 'OPTION'), day('11:00', '12:00', 'CANCELLED')];
        const postId = await createEvent(requestUtils, uniqueTitle('Cancel link day'), dates);
        created.push({ type: 'soli_event', id: postId });
        const link = await setLink(postId, 'enable');

        const { context, page } = await pageFor(browser, 'anonymous');
        await page.goto(link.url);
        const block = page.locator('.soli-cancel-dates');
        await block.getByRole('button', { name: 'Cancel all dates on Tue 6 May' }).click();
        await expect(block.getByRole('button', { name: 'Undo all cancellations on Tue 6 May' })).toHaveText('Undo day');
        await expect(block.locator('.soli-cancel-dates__summary')).toHaveText('0 of 3 dates go ahead · 0 hours');

        const byStart = (all: any[]) => all.sort((a, b) => a.start_date.localeCompare(b.start_date));
        let stored = byStart(await rows(postId));
        expect(stored.map((r) => [r.status, r.cancelled_externally])).toEqual([
            ['CANCELLED', true],
            ['CANCELLED', true],
            ['CANCELLED', false],
        ]);

        await block.getByRole('button', { name: 'Undo all cancellations on Tue 6 May' }).click();
        await expect(block.getByRole('button', { name: 'Cancel all dates on Tue 6 May' })).toHaveText('Cancel whole day');
        stored = byStart(await rows(postId));
        expect(stored.map((r) => r.status)).toEqual(['PLANNED', 'OPTION', 'CANCELLED']);
        await context.close();
    });

    test('the page without a valid token shows no event', async ({ requestUtils, browser }) => {
        const title = uniqueTitle('Cancel link hidden');
        const postId = await createEvent(requestUtils, title);
        created.push({ type: 'soli_event', id: postId });
        const link = await setLink(postId, 'enable');

        const { context, page } = await pageFor(browser, 'anonymous');
        const url = new URL(link.url);
        url.searchParams.delete('token');
        await page.goto(url.toString());
        await expect(page.getByText('Open this page through the cancellation link')).toBeVisible();
        await expect(page.getByText(title)).toHaveCount(0);

        url.searchParams.set('token', '00000000-0000-4000-8000-000000000000');
        await page.goto(url.toString());
        await expect(page.getByText('This link is not valid (anymore)')).toBeVisible();
        await expect(page.getByText(title)).toHaveCount(0);
        await context.close();
    });

    test('editors can replace the intro and both link messages', async ({ requestUtils, browser }) => {
        const attrs = {
            intro: 'Klik op <strong>een tijd</strong>.',
            noLinkText: 'Gebruik de link uit de mail.',
            invalidText: 'Deze link werkt niet meer.',
        };
        const custom = await requestUtils.rest({
            method: 'POST',
            path: '/wp/v2/pages',
            data: { title: 'Cancel dates custom', status: 'publish', content: `<!-- wp:soli/event-cancel-dates ${JSON.stringify(attrs)} /-->` },
        });
        created.push({ type: 'pages', id: custom.id });
        const postId = await createEvent(requestUtils, uniqueTitle('Cancel link texts'));
        created.push({ type: 'soli_event', id: postId });
        const token = tokenOf((await setLink(postId, 'enable')).url);

        const { context, page } = await pageFor(browser, 'anonymous');
        const url = new URL(custom.link);
        await page.goto(url.toString());
        await expect(page.getByText(attrs.noLinkText)).toBeVisible();

        url.searchParams.set('token', '00000000-0000-4000-8000-000000000000');
        await page.goto(url.toString());
        await expect(page.getByText(attrs.invalidText)).toBeVisible();

        url.searchParams.set('token', token);
        await page.goto(url.toString());
        const intro = page.locator('.soli-cancel-dates__intro');
        await expect(intro).toHaveText('Klik op een tijd.');
        await expect(intro.locator('strong')).toHaveText('een tijd');
        await context.close();
    });

    test('the token only reaches its own event, and only while the link is on', async ({ requestUtils }) => {
        const postId = await createEvent(requestUtils, uniqueTitle('Cancel link scope'));
        const otherId = await createEvent(requestUtils, uniqueTitle('Cancel link other'));
        created.push({ type: 'soli_event', id: postId }, { type: 'soli_event', id: otherId });

        const token = tokenOf((await setLink(postId, 'enable')).url);
        const mine = await rows(postId);
        const other = await rows(otherId);

        // A date of another event, a made-up token and a malformed token are all refused.
        expect((await toggle(token, rowAt(other, FUTURE.start_date).id, true)).status).toBe(404);
        expect((await toggle('00000000-0000-4000-8000-000000000000', rowAt(mine, FUTURE.start_date).id, true)).status).toBe(404);
        expect((await toggle("' OR 1=1 --", rowAt(mine, FUTURE.start_date).id, true)).status).toBe(404);
        expect(rowAt(await rows(otherId), FUTURE.start_date).status).toBe('PLANNED');

        // A date Soli cancelled stays cancelled.
        expect((await toggle(token, rowAt(mine, BY_SOLI.start_date).id, false)).status).toBe(409);

        // Past dates are fair game too.
        const past = await toggle(token, rowAt(mine, PAST.start_date).id, true);
        expect(past.status).toBe(200);
        expect(past.body.dates[0]).toEqual(expect.objectContaining({ cancelled: true, locked: false }));
        // The response carries nothing beyond the dates themselves.
        expect(Object.keys(past.body)).toEqual(['dates']);
        expect(Object.keys(past.body.dates[0]).sort()).toEqual(['cancelled', 'end_date', 'id', 'locked', 'start_date']);

        // One foreign id spoils the whole request, and the batch size is capped.
        expect((await toggle(token, [rowAt(mine, FUTURE.start_date).id, rowAt(other, FUTURE.start_date).id], true)).status).toBe(404);
        expect(rowAt(await rows(postId), FUTURE.start_date).status).toBe('PLANNED');
        expect((await toggle(token, Array.from({ length: 101 }, (_, i) => i + 1), true)).status).toBe(400);

        // A new link kills the old one.
        const rotated = tokenOf((await setLink(postId, 'rotate')).url);
        expect(rotated).not.toBe(token);
        expect((await toggle(token, rowAt(mine, FUTURE.start_date).id, true)).status).toBe(404);
        expect((await toggle(rotated, rowAt(mine, FUTURE.start_date).id, true)).status).toBe(200);

        // Switching it off kills it too.
        const off = await setLink(postId, 'disable');
        expect(off.enabled).toBe(false);
        expect(off.url).toBe('');
        expect((await toggle(rotated, rowAt(mine, FUTURE_2.start_date).id, true)).status).toBe(404);
    });

    test('only people who may edit the event manage its link, and the token never leaks', async ({ requestUtils }) => {
        const postId = await createEvent(requestUtils, uniqueTitle('Cancel link access'));
        created.push({ type: 'soli_event', id: postId });
        const token = tokenOf((await setLink(postId, 'enable')).url);

        for (const role of ['anonymous', 'subscriber'] as const) {
            const api = await apiFor(role);
            expect((await api.get(`/wp-json/soli_event/v1/cancel-link/${postId}`)).status()).toBeGreaterThanOrEqual(401);
            expect(
                (await api.post(`/wp-json/soli_event/v1/cancel-link/${postId}`, { data: { action: 'rotate' } })).status()
            ).toBeGreaterThanOrEqual(401);
            await api.dispose();
        }

        // Not in the post's REST representation, not even in edit context, and not on public endpoints.
        const admin = await apiFor('admin');
        for (const path of [
            `/wp-json/wp/v2/soli_event/${postId}?context=edit`,
            `/wp-json/soli_event/v1/events/${postId}`,
        ]) {
            expect(await (await admin.get(path)).text()).not.toContain(token);
        }
        // A non-event post id is refused.
        const pageId = created.find((c) => c.type === 'pages')!.id;
        expect((await admin.post(`/wp-json/soli_event/v1/cancel-link/${pageId}`, { data: { action: 'enable' } })).status()).toBe(403);
        await admin.dispose();
    });

    test('an editor save with stale dates keeps the external cancellation', async ({ requestUtils }) => {
        const postId = await createEvent(requestUtils, uniqueTitle('Cancel link stale save'));
        created.push({ type: 'soli_event', id: postId });
        const token = tokenOf((await setLink(postId, 'enable')).url);

        // The editor loaded the dates before the link was used.
        const loaded = await rows(postId);
        const target = rowAt(loaded, FUTURE.start_date);
        expect((await toggle(token, target.id, true)).status).toBe(200);

        const save = async (dates: any[]) => {
            const admin = await apiFor('admin');
            const body = dates.map((r) => ({
                id: r.id,
                start_date: r.start_date,
                end_date: r.end_date,
                rooms: null,
                status: r.status,
                is_concert: false,
                notes: 'edited',
                external_rev: r.external_rev,
            }));
            const res = await admin.post(`/wp-json/soli_event/v1/events/${postId}`, { data: body });
            expect(res.ok()).toBeTruthy();
            await admin.dispose();
        };

        await save(loaded);
        let row = rowAt(await rows(postId), FUTURE.start_date);
        expect(row.status).toBe('CANCELLED');
        expect(row.cancelled_externally).toBe(true);
        // The rest of the stale save still applies.
        expect(row.notes).toBe('edited');

        // A save that saw the cancellation may undo it, and the date is then no longer the link's.
        const fresh = await rows(postId);
        await save(fresh.map((r) => (r.id === target.id ? { ...r, status: 'PLANNED' } : r)));
        row = rowAt(await rows(postId), FUTURE.start_date);
        expect(row.status).toBe('PLANNED');
        expect(row.cancelled_externally).toBe(false);
    });

    test('cancelled dates are crossed out on the invoice and not charged', async ({ requestUtils, admin, page }) => {
        const title = uniqueTitle('Cancel link invoice');
        const postId = await createEvent(requestUtils, title, [FUTURE, BY_SOLI]);
        created.push({ type: 'soli_event', id: postId });

        await admin.visitAdminPage(`post.php?post=${postId}&action=edit`);
        const invoiceButton = page.locator('.editor-header').getByRole('button', { name: 'Invoice this event' });
        await invoiceButton.waitFor({ state: 'visible', timeout: 30_000 });
        await invoiceButton.click();
        const modal = page.locator('.invoice-event-modal');
        await expect(modal.locator('.invoice-date-row.is-cancelled')).toHaveCount(1);
        await expect(modal.locator('.invoice-date-row.is-cancelled')).toContainText('Cancelled');
        await modal.getByLabel('Hourly rate (€)').fill('40');

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            modal.getByRole('button', { name: 'Download invoice' }).click(),
        ]);
        const xml = readZipEntry(require('fs').readFileSync((await download.path())!), 'word/document.xml')!;
        expect(xml).toContain('Geannuleerd');
        expect(xml).toMatch(/<w:strike\/>|<w:strike w:val="true"\/>/);
        // Only the 2,5-hour date is charged: 2,5 x 40 = 100, and only row 2 is in the formulas.
        expect(xml).toContain('=B2*C2 ');
        expect(xml).not.toContain('B3*C3');
        expect(xml).toContain('€ 100,00');
    });
    test('the editor turns the link on, renews and turns it off in the sidebar', async ({ requestUtils, admin, page }) => {
        const postId = await createEvent(requestUtils, uniqueTitle('Cancel link sidebar'));
        created.push({ type: 'soli_event', id: postId });
        await admin.visitAdminPage(`post.php?post=${postId}&action=edit`);

        // Sidebar and panel open state is remembered per user, shared with other specs.
        const panel = page.locator('.soli-event-cancel-link-panel');
        if ((await panel.count()) === 0) {
            await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
            await panel.waitFor({ state: 'attached', timeout: 30_000 });
        }
        const toggleControl = panel.getByLabel('Allow cancelling through a link');
        if (!(await toggleControl.isVisible())) {
            await panel.getByRole('button', { name: 'Cancellation link', exact: true }).click();
        }
        await expect(toggleControl).not.toBeChecked();

        // Controlled by the REST response, so it flips only after the request returns.
        await toggleControl.click();
        await expect(toggleControl).toBeChecked();
        const field = panel.getByLabel('Link', { exact: true });
        await expect(field).toHaveValue(/[?&]token=[0-9a-f-]{36}$/);
        const first = await field.inputValue();

        page.once('dialog', (dialog) => dialog.accept());
        await panel.getByRole('button', { name: 'Renew link' }).click();
        await expect(field).not.toHaveValue(first);
        expect(tokenOf(await field.inputValue())).not.toBe(tokenOf(first));

        await toggleControl.click();
        await expect(toggleControl).not.toBeChecked();
        await expect(field).toHaveCount(0);
        const admin2 = await apiFor('admin');
        const state = await (await admin2.get(`/wp-json/soli_event/v1/cancel-link/${postId}`)).json();
        expect(state.enabled).toBe(false);
        await admin2.dispose();
    });
});
