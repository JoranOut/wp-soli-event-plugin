import dayjs from "dayjs";

export const PAGE_SIZE = 20;

export function sortByStartDate(a, b) {
    const da = dayjs(a.startDate);
    const db = dayjs(b.startDate);
    if (da.isBefore(db)) return -1;
    if (da.isAfter(db)) return 1;
    return 0;
}

// Pairs each date with its state index, ordered by start date. Rows keep the
// state index so edit/delete actions still target the right event.
export function orderEvents(events) {
    return events
        .map((date, index) => ({date, index}))
        .sort((a, b) => sortByStartDate(a.date, b.date));
}

// Page of PAGE_SIZE dates starting at the first one ending on or after `from`.
// When no date is that late, the last page is shown instead. A list that
// fits on one page is shown whole.
export function windowFrom(ordered, from) {
    const total = ordered.length;
    if (total <= PAGE_SIZE) {
        return {start: 0, end: total};
    }
    const anchor = dayjs(from);
    let start = ordered.findIndex(({date}) => !dayjs(date.endDate).isBefore(anchor));
    if (start === -1) {
        start = Math.max(0, total - PAGE_SIZE);
    }
    return {start, end: Math.min(total, start + PAGE_SIZE)};
}

// Dates added or deleted shift the list; keep the window inside it.
export function clampWindow({start, end}, total) {
    const clampedEnd = Math.min(end, total);
    const clampedStart = Math.min(start, Math.max(0, clampedEnd - 1));
    if (clampedEnd <= clampedStart) {
        return {start: Math.max(0, total - PAGE_SIZE), end: total};
    }
    return {start: clampedStart, end: clampedEnd};
}

// Date id from the ?soli_event_date= link of the admin Calendar View. Read when
// the script loads: the editor rewrites the URL before the date list mounts.
const LINKED_DATE_ID = (() => {
    const id = new URLSearchParams(window.location.search).get('soli_event_date');
    return id ? Number(id) : null;
})();

export function linkedDateId() {
    return LINKED_DATE_ID;
}
