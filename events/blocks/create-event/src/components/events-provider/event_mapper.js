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
    }
}

function defaultDate() {
    return {
        startDate: new Date(),
        endDate: new Date().addHours(1)
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
