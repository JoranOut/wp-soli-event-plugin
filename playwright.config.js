import {defineConfig} from '@playwright/test';
const baseConfig = require( '@wordpress/scripts/config/playwright.config' );

const config = defineConfig({
    ...baseConfig,
    testDir: 'e2e',
    // Our setup seeds the visibility catalogue + role users and mints per-role
    // storageStates, in addition to the base admin storageState.
    globalSetup: require.resolve('./e2e/global-setup.ts'),
    // Tests share one WordPress instance, so each test isolates itself by using
    // a unique event title and scoping all assertions to it (no global post
    // deletion). That keeps them safe to run fully in parallel.
    fullyParallel: true,
    retries: process.env.CI ? 1 : 0,                 // enables "on-first-retry" if you prefer it
    reporter: [['html', { open: 'never' }]],
    use: {
        // Spread the base `use` so we keep its `storageState` (authenticated
        // session) and `contextOptions` - otherwise the browser context loads
        // no auth and every test would need to log in manually.
        ...baseConfig.use,
        baseURL: process.env.BASE_URL || 'http://localhost:8901',
        screenshot: 'only-on-failure',
        video: process.env.CI ? 'retain-on-failure' : 'on', // keep videos for failures in CI
        trace: 'retain-on-failure',                         // full click-by-click trace on failure
    },
    outputDir: 'test-results',                            // where videos/traces/screens land
    webServer: {
        ...baseConfig.webServer,
        command: 'npm run wp-env:start',
    }
});

export default config;