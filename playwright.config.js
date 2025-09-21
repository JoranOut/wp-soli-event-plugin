import {defineConfig} from '@playwright/test';

export default defineConfig({
    testDir: 'e2e',
    use: {
        baseURL: 'http://localhost:8889'
    },
    webServer: undefined
});