/**
 * Translation completeness: every msgid in the .pot has a Dutch translation,
 * and the JSON files WordPress loads for the reservation block carry them.
 * The test site runs en_US, so this checks the files rather than a rendered page.
 */
import { test, expect } from '@playwright/test';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const LANGUAGES = path.join(__dirname, '..', 'languages');

type Entry = { msgid: string; msgstr: string[] };

// Minimal .po reader: msgctxt is not used in this plugin, plurals are.
function readPo(file: string): Entry[] {
    const entries: Entry[] = [];
    let current: Entry | null = null;
    let target: 'msgid' | 'msgid_plural' | number | null = null;
    const unquote = (s: string) => JSON.parse(s);

    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        let m: RegExpMatchArray | null;
        if ((m = line.match(/^msgid (".*")$/))) {
            current = { msgid: unquote(m[1]), msgstr: [] };
            entries.push(current);
            target = 'msgid';
        } else if ((m = line.match(/^msgid_plural (".*")$/))) {
            target = 'msgid_plural';
        } else if ((m = line.match(/^msgstr(?:\[(\d+)\])? (".*")$/)) && current) {
            target = m[1] ? Number(m[1]) : 0;
            current.msgstr[target] = unquote(m[2]);
        } else if ((m = line.match(/^(".*")$/)) && current) {
            if (target === 'msgid') {
                current.msgid += unquote(m[1]);
            } else if (typeof target === 'number') {
                current.msgstr[target] += unquote(m[1]);
            }
        } else if (!line.startsWith('"')) {
            target = target === 'msgid' ? target : null;
        }
    }
    return entries.filter((e) => e.msgid !== '');
}

test.describe('Translations', () => {
    test('every string in the .pot has a Dutch translation', () => {
        const pot = readPo(path.join(LANGUAGES, 'soli-event.pot'));
        const nl = new Map(readPo(path.join(LANGUAGES, 'soli-event-nl_NL.po')).map((e) => [e.msgid, e]));

        const missing = pot
            .filter((e) => !nl.get(e.msgid)?.msgstr.every((s) => s && s.trim()))
            .map((e) => e.msgid);
        expect(missing).toEqual([]);
        expect(fs.readFileSync(path.join(LANGUAGES, 'soli-event-nl_NL.po'), 'utf8')).toContain('"Language: nl_NL\\n"');
    });

    for (const bundle of ['build/frontend.js', 'build/index.js']) {
        test(`the reservation block's ${bundle} has Dutch JSON translations`, () => {
            const source = `events/blocks/event-reservation-popup/${bundle}`;
            const hash = crypto.createHash('md5').update(source).digest('hex');
            const json = JSON.parse(fs.readFileSync(path.join(LANGUAGES, `soli-event-nl_NL-${hash}.json`), 'utf8'));
            const messages = json.locale_data.messages;

            expect(messages[''].lang).toBe('nl_NL');
            expect(messages['Open in e-mail']).toEqual(['Openen in e-mail']);
            expect(messages['Dear Muziekvereniging Soli,']).toEqual(['Beste Muziekvereniging Soli,']);
            expect(messages['Something is already planned at this time:']).toEqual(['Op dit moment staat er al iets gepland:']);
            expect(messages['in use %s']).toEqual(['in gebruik %s']);
        });
    }
});
