import {defineConfig} from '@playwright/test';
const baseConfig = require( '@wordpress/scripts/config/playwright.config' );

const config = defineConfig({
    ...baseConfig,
    testDir: 'e2e',
    // Tests share a single WordPress instance and each beforeEach deletes all
    // soli_event/pages posts, so parallel workers clobber each other's fixtures.
    // Run serially to keep the suite deterministic.
    workers: 1,
    retries: process.env.CI ? 1 : 0,                 // enables "on-first-retry" if you prefer it
    reporter: [['html', { open: 'never' }]],
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:8889',
        screenshot: 'only-on-failure',
        video: process.env.CI ? 'retain-on-failure' : 'on', // keep videos for failures in CI
        trace: 'retain-on-failure',                         // full click-by-click trace on failure
    },
    outputDir: 'test-results',                            // where videos/traces/screens land
    webServer: {
        ...baseConfig.webServer,
        command: 'npm run env:start',
    }
});

export default config;