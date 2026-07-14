export function normalizeEvents(events) {
    if (!Array.isArray(events)) return [];

    return events.map((e) => ({
        id: e.id ?? null,
        startDate: e.startDate
            ? new Date(e.startDate).toISOString()
            : null,
        endDate: e.endDate
            ? new Date(e.endDate).toISOString()
            : null,
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
