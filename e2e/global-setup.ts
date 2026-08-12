/**
 * Custom Playwright global setup. Replaces the @wordpress/scripts default so we
 * can, in one place:
 *   1. mint the admin storageState (unchanged base behaviour),
 *   2. seed the visibility catalogue + role users (e2e/fixtures/seed.php),
 *   3. mint storageStates for the seeded subscriber / editor users.
 *
 * Wired via `globalSetup` in playwright.config.js.
 */
import { request, type FullConfig } from '@playwright/test';
import { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { ROLE_USERS, storageStateFor } from './fixtures/catalogue';

const PLUGIN_PATH = 'wp-content/plugins/wp-soli-event-plugin/e2e/fixtures/seed.php';

async function globalSetup(config: FullConfig) {
    const baseURL = (config.projects[0].use.baseURL as string) || 'http://localhost:8901';

    // 1. Admin storageState (base behaviour). WP_ADMIN_USER by default.
    const adminCtx = await request.newContext({ baseURL });
    const adminUtils = new RequestUtils(adminCtx, {
        storageStatePath: process.env.STORAGE_STATE_PATH,
    });
    await adminUtils.setupRest();
    await adminCtx.dispose();

    // 2. Seed the catalogue into the tests instance (idempotent). Runs in the
    //    tests-cli container, which backs baseURL :8901.
    execSync(`npx wp-env run tests-cli wp eval-file ${PLUGIN_PATH}`, {
        stdio: 'inherit',
    });

    // 3. Role storageStates. Users were just created by the seeder.
    for (const [role, user] of Object.entries(ROLE_USERS) as [
        keyof typeof ROLE_USERS,
        { username: string; password: string }
    ][]) {
        const statePath = storageStateFor(role);
        if (!statePath) continue;
        fs.mkdirSync(require('path').dirname(statePath), { recursive: true });
        const ctx = await request.newContext({ baseURL });
        const utils = new RequestUtils(ctx, { user, storageStatePath: statePath });
        await utils.setupRest();
        await ctx.dispose();
    }
}

export default globalSetup;
