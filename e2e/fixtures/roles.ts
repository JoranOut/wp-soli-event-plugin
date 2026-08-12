/**
 * Per-role browser/API contexts for visibility tests. `anonymous` gets a fresh
 * context with no auth; other roles load the storageState minted in global-setup.
 */
import {
    request,
    type APIRequestContext,
    type Browser,
    type BrowserContext,
    type Page,
} from '@playwright/test';
import * as fs from 'fs';
import { type Role, storageStateFor } from './catalogue';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:8901';

// The storageState files minted by RequestUtils carry a `nonce` alongside the
// cookies. WordPress REST cookie auth is rejected without the X-WP-Nonce header,
// so authenticated API contexts must replay it.
function nonceFrom(storageState: string): string | undefined {
    try {
        return JSON.parse(fs.readFileSync(storageState, 'utf8')).nonce;
    } catch {
        return undefined;
    }
}

// An explicitly EMPTY storage state. Required for truly-anonymous contexts:
// the project config sets `use.storageState` to the admin session, and manual
// newContext() calls inherit it unless overridden — so omitting storageState
// silently produced admin-authenticated "anonymous" contexts. Passing an empty
// state guarantees no auth.
const EMPTY_STATE = { cookies: [], origins: [] };

export async function pageFor(
    browser: Browser,
    role: Role
): Promise<{ context: BrowserContext; page: Page }> {
    const storageState = storageStateFor(role);
    const context = await browser.newContext({ storageState: storageState ?? EMPTY_STATE });
    const page = await context.newPage();
    return { context, page };
}

export async function apiFor(role: Role): Promise<APIRequestContext> {
    const storageState = storageStateFor(role);
    if (!storageState) {
        return request.newContext({ baseURL: BASE_URL, storageState: EMPTY_STATE });
    }
    const nonce = nonceFrom(storageState);
    return request.newContext({
        baseURL: BASE_URL,
        storageState,
        ...(nonce ? { extraHTTPHeaders: { 'X-WP-Nonce': nonce } } : {}),
    });
}

export const ALL_ROLES: Role[] = ['anonymous', 'subscriber', 'editor', 'admin'];
