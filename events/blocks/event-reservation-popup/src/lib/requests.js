import {__, sprintf} from '@wordpress/i18n';
import {ROOM_NAMES, ROOM_SLUGS} from '../../../../inc/values';
import {atTime, formatLongDate, formatTime, toISODate, todayISO} from './dates';

let nextId = 1;

export function newRequest(overrides = {}) {
    return {
        id: `r${nextId++}`,
        date: '',
        endDate: '',
        multiDay: false,
        from: '19:00',
        until: '22:00',
        rooms: [],
        ...overrides,
    };
}

export function requestRange(request) {
    const start = atTime(request.date, request.from);
    const end = atTime(request.multiDay ? request.endDate : request.date, request.until);
    return {start, end};
}

export const isWholeBuilding = (rooms) => ROOM_SLUGS.every((slug) => rooms.includes(slug));

export function roomLabel(rooms) {
    if (isWholeBuilding(rooms)) {
        return __('Whole building', 'soli-event');
    }
    return ROOM_SLUGS.filter((slug) => rooms.includes(slug))
        .map((slug) => ROOM_NAMES[ROOM_SLUGS.indexOf(slug)])
        .join(', ');
}

// Returns {code, text} for each problem that keeps a request out of the e-mail, in reading order.
export function requestProblems(request) {
    const problems = [];
    const {start, end} = requestRange(request);
    if (!request.date) {
        problems.push({code: 'date', text: __('choose a date', 'soli-event')});
    } else if (request.date < todayISO()) {
        problems.push({code: 'past', text: __('the date has passed', 'soli-event')});
    }
    if (request.multiDay && !request.endDate) {
        problems.push({code: 'end-date', text: __('choose the last day', 'soli-event')});
    }
    if (!request.from || !request.until) {
        problems.push({code: 'times', text: __('fill in both times', 'soli-event')});
    } else if (start && end && end <= start) {
        problems.push({
            code: 'order',
            text: request.multiDay
                ? __('it ends before it starts', 'soli-event')
                : __('the end time is before the start time', 'soli-event'),
        });
    }
    if (request.rooms.length === 0) {
        problems.push({code: 'rooms', text: __('choose at least one room', 'soli-event')});
    }
    return problems;
}

function describeWhen(request) {
    const {start, end} = requestRange(request);
    if (!start || !end || end <= start) {
        return __('[day and time still to choose]', 'soli-event');
    }
    if (!request.multiDay || toISODate(start) === toISODate(end)) {
        /* translators: 1: long date, 2: start time, 3: end time */
        return sprintf(__('%1$s, %2$s – %3$s', 'soli-event'), formatLongDate(request.date), formatTime(start), formatTime(end));
    }
    /* translators: 1: first day, 2: start time, 3: last day, 4: end time */
    return sprintf(__('from %1$s %2$s until %3$s %4$s', 'soli-event'),
        formatLongDate(request.date), formatTime(start), formatLongDate(request.endDate), formatTime(end));
}

export const defaultTemplate = () => [
    __('Dear Muziekvereniging Soli,', 'soli-event'),
    '',
    __('I would like to reserve the following rooms in the Soli Muziekcentrum:', 'soli-event'),
    '',
    '{reservations}',
    '',
    '{note}',
    '',
    __('Could you let me know whether this is possible?', 'soli-event'),
    '',
    __('Kind regards,', 'soli-event'),
    '{name}',
].join('\n');

export const defaultSubject = () => __('Room reservation Soli Muziekcentrum', 'soli-event');

export const defaultNotePlaceholder = () =>
    __('For example: choir rehearsal, about 30 people, we bring our own piano player.', 'soli-event');

// An empty {note} drops its line, so the template never leaves a gap behind.
export function buildLetter({requests, name, note, template}) {
    const reservations = requests.map((request) => [
        `♫ ${roomLabel(request.rooms) || __('[rooms still to choose]', 'soli-event')}`,
        `   ${describeWhen(request)}`,
    ].join('\n')).join('\n\n');
    const values = {
        reservations,
        note: note.trim(),
        name: name.trim() || __('[Your name]', 'soli-event'),
    };
    return (template?.trim() ? template : defaultTemplate())
        .split('\n')
        .filter((line) => !(line.trim() === '{note}' && !values.note))
        .join('\n')
        .replace(/\{(reservations|note|name)\}/g, (_, key) => values[key])
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
