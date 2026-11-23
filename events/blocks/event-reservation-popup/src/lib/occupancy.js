import {addDays, parseLocal} from './dates';
import {requestRange} from './requests';

const DAY = 24 * 60;

// Minutes since the start of `day` for the part of [start, end) that falls on that day.
export function clipToDay(day, start, end) {
    const dayStart = parseLocal(day);
    const dayEnd = parseLocal(addDays(day, 1));
    if (!start || !end || end <= dayStart || start >= dayEnd) {
        return null;
    }
    const from = Math.max(0, (start - dayStart) / 60000);
    const until = Math.min(DAY, (end - dayStart) / 60000);
    return until > from ? {from, until} : null;
}

export function conflictsFor(request, occupancy, days) {
    const {start, end} = requestRange(request);
    if (!start || !end || end <= start) {
        return [];
    }
    const seen = new Set();
    const conflicts = [];
    days.forEach((day) => {
        (occupancy[day]?.busy || []).forEach((item) => {
            item.rooms.filter((room) => request.rooms.includes(room)).forEach((room) => {
                const key = `${item.id}:${room}`;
                if (seen.has(key) || item.end <= start || item.start >= end) {
                    return;
                }
                seen.add(key);
                conflicts.push({room, start: item.start, end: item.end});
            });
        });
    });
    return conflicts.sort((a, b) => a.start - b.start);
}
