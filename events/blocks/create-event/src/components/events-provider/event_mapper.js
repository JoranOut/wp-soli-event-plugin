function fromEventDto(eventDto) {
    return eventDto ? eventDto.map(fromDateDto) : null
}

function fromDateDto(dateDto) {
    return {
        id: dateDto.id,
        startDate: dateDto.start_date + " UTC",
        endDate: dateDto.end_date + " UTC",
        location: fromLocationDto(dateDto),
        rooms: JSON.parse(dateDto.rooms),
        status: dateDto.status,
        concertStatus: dateDto.is_concert,
        notes: dateDto.notes,
    }
}

function fromLocationDto(dateDto) {
    if (!dateDto.location_id) {
        return null;
    }
    return {
        id: dateDto.location_id,
        name: dateDto.location_name,
        address: dateDto.location_address,
    }
}

function toEventDto(event) {
    return event ? event.map((e) => toDateDto(e)) : [];
}

function toDateDto(date) {
    return {
        id: date.id,
        start_date: date.startDate,
        end_date: date.endDate,
        location: !date.location ? null : date.location.id,
        rooms: !date.rooms ? null : JSON.stringify(date.rooms),
        status: date.status,
        is_concert: date.concertStatus,
        notes: date.notes,
    }
}

Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}

module.exports = {
    fromEventDto,
    toEventDto
}
