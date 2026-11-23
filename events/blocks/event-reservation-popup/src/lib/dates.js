const pad = (n) => String(n).padStart(2, '0');

export const toISODate = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayISO = () => toISODate(new Date());

export function addDays(isoDate, days) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return toISODate(new Date(y, m - 1, d + days));
}

// The API sends "YYYY-MM-DD HH:MM:SS" in site time; Safari will not parse the
// space-separated form with `new Date()`, so split it by hand.
export function parseLocal(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(value || '');
    if (!match) {
        return null;
    }
    const [y, m, d, h, min] = match.slice(1).map((v) => Number(v ?? 0));
    return new Date(y, m - 1, d, h, min);
}

export const atTime = (isoDate, time) => (isoDate && time ? parseLocal(`${isoDate} ${time}`) : null);

export const formatTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const minutesToTime = (minutes) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

export function daysBetween(fromISO, toISO) {
    const days = [];
    let day = fromISO;
    while (day <= toISO && days.length < 14) {
        days.push(day);
        day = addDays(day, 1);
    }
    return days;
}

const locale = () => (typeof document !== 'undefined' && document.documentElement.lang) || 'nl-NL';

export function formatLongDate(isoDate) {
    const date = parseLocal(isoDate);
    if (!date) {
        return '';
    }
    return new Intl.DateTimeFormat(locale(), {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(date);
}

export function formatShortDate(isoDate) {
    const date = parseLocal(isoDate);
    if (!date) {
        return '';
    }
    return new Intl.DateTimeFormat(locale(), {weekday: 'short', day: 'numeric', month: 'short'}).format(date);
}
