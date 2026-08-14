/**
 * PHP diagnostics guard.
 *
 * Two things are asserted here, and the first one exists to keep the second
 * one honest:
 *
 *  1. The environment under test really has WP_DEBUG (and WP_DEBUG_DISPLAY)
 *     enabled. wp-env's built-in defaults set `env.tests.config.WP_DEBUG` to
 *     FALSE, and a top-level `config` block in .wp-env.json does NOT override
 *     that - so without an explicit `env.tests.config` block the tests site
 *     silently swallows every notice/warning, and assertion (2) would pass no
 *     matter how broken the PHP is. Site Health's "WordPress Constants" table
 *     reports the constants the *web* requests actually run with, which is
 *     exactly what the browser-driven tests below depend on.
 *
 *  2. Rendering the plugin's front-end and admin surfaces emits no PHP
 *     notices, warnings, deprecations or fatals.
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { pageFor } from './fixtures/roles';

// PHP prints diagnostics as either `<b>Warning</b>:  msg in <b>file</b> on line <b>N</b>`
// (html_errors=On) or `Warning: msg in file on line N` (html_errors=Off). Both
// forms end in "on line", which is what keeps this from matching prose that
// merely contains the word "Notice".
const PHP_DIAGNOSTIC =
    /(?:<b>)?(?:PHP\s+)?(Warning|Notice|Fatal error|Parse error|Deprecated|Recoverable fatal error)(?:<\/b>)?:[\s\S]{0,500}?on line/i;

// WordPress' fatal-error handler replaces the page when display is off.
const WP_FATAL = /There has been a critical error on this website/i;

function assertNoPhpDiagnostics(html: string, where: string) {
    const diagnostic = html.match(PHP_DIAGNOSTIC);
    expect(
        diagnostic?.[0] ?? null,
        `${where} rendered a PHP diagnostic`
    ).toBeNull();
    expect(WP_FATAL.test(html), `${where} hit the WordPress fatal handler`).toBe(
        false
    );
}

test.describe('PHP diagnostics', () => {
    test('the site under test runs with WP_DEBUG and WP_DEBUG_DISPLAY enabled', async ({
        page,
    }) => {
        await page.goto('/wp-admin/site-health.php?tab=debug');
        // The "WordPress Constants" table lives in a collapsed accordion panel.
        // Target the trigger by aria-controls rather than by its own id: WordPress
        // only added `id="health-check-section-*"` to that button in 7.0, so an
        // id selector silently times out on the floor leg of the matrix, while
        // aria-controls is the a11y contract its own JS relies on and is present
        // in every version the suite runs against.
        await page
            .locator(
                'button[aria-controls="health-check-accordion-block-wp-constants"]'
            )
            .click();
        const panel = page.locator('#health-check-accordion-block-wp-constants');

        for (const constant of ['WP_DEBUG', 'WP_DEBUG_DISPLAY']) {
            const row = panel.locator('tr').filter({
                has: page.getByRole('rowheader', { name: constant, exact: true }),
            });
            await expect(
                row.locator('td'),
                `${constant} must be enabled, otherwise the PHP-error assertions below are vacuous`
            ).toHaveText('Enabled');
        }
    });

    test('front-end event surfaces render without PHP diagnostics', async ({
        browser,
    }) => {
        const { context, page } = await pageFor(browser, 'anonymous');

        for (const url of ['/', '/evenement/', '/?s=VIZ%3A']) {
            await page.goto(url);
            assertNoPhpDiagnostics(await page.content(), url);
        }

        // Also render one real single-event page, which pulls in the dates,
        // location and next-concert rendering paths.
        await page.goto('/evenement/');
        const eventLink = page.locator('a[href*="/evenement/"]').first();
        await expect(
            eventLink,
            'the seeded catalogue should list at least one public event'
        ).toHaveCount(1);
        const href = await eventLink.getAttribute('href');
        await page.goto(href as string);
        assertNoPhpDiagnostics(await page.content(), href as string);

        await context.close();
    });

    test('admin event surfaces render without PHP diagnostics', async ({
        page,
    }) => {
        const urls = [
            '/wp-admin/edit.php?post_type=soli_event',
            '/wp-admin/edit.php?post_type=soli_event&page=soli_event_admin_view',
            '/wp-admin/edit.php?post_type=soli_event&page=soli_event_admin_log',
            '/wp-admin/options-general.php?page=soli_event_settings',
        ];

        for (const url of urls) {
            await page.goto(url);
            assertNoPhpDiagnostics(await page.content(), url);
        }
    });
});
