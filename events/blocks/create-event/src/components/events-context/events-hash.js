function toIso(value) {
    if (!value) return null;
    const date = new Date(value);
    // An invalid date would make toISOString() throw a RangeError, which would
    // bubble out of the reducer and crash the block; treat it as null instead.
    return isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeEvents(events) {
    if (!Array.isArray(events)) return [];

    return events.map((e) => ({
        id: e.id ?? null,
        startDate: toIso(e.startDate),
        endDate: toIso(e.endDate),
        locationId: e.location?.id ?? null,
        locationName: e.location?.name ?? null,
        rooms: e.rooms ?? [],
        status: e.status ?? null,
        concertStatus: e.concertStatus ?? null,
        notes: e.notes ?? null,
        adminNotes: e.adminNotes ?? null,
    }));
}

export function toHash(events) {
    return JSON.stringify(normalizeEvents(events));
}
