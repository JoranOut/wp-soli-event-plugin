import {defineConfig} from '@playwright/test';

export default defineConfig({
    testDir: 'e2e',
    retries: process.env.CI ? 1 : 0,                 // enables "on-first-retry" if you prefer it
    reporter: [['html', { open: 'never' }]],
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:8889',
        screenshot: 'only-on-failure',
        video: process.env.CI ? 'retain-on-failure' : 'on', // keep videos for failures in CI
        trace: 'retain-on-failure',                         // full click-by-click trace on failure
    },
    outputDir: 'test-results',                            // where videos/traces/screens land
    webServer: undefined
});