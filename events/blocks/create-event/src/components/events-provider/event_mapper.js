
function fromEventDto(eventDto) {
    return {
        main: eventDto ? fromDateDto(eventDto.main) : defaultDate(),
        repeated: eventDto && eventDto.repeated ? eventDto.repeated.map(fromDateDto) : null,
        isRepeatedDate: !!(eventDto && eventDto.repeated)
    }
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
    if (!dateDto.location_id){
        return null;
    }
    return {
        id: dateDto.location_id,
        name: dateDto.location_name,
        address: dateDto.location_address,
    }
}

function toEventDto(event) {
    return {
        main: toDateDto(event.main),
        repeated: event.repeated && event.isRepeatedDate ? event.repeated.map((e) => toDateDto(e, event.main)) : null
    }
}

function toDateDto(date, main) {
    return {
        id: date.id,
        start_date: date.startDate,
        end_date: date.endDate,
        location: ! date.location || (main && main.location && date.location.id === main.location.id) ? null : date.location.id,
        rooms: !date.rooms || (main && equalArrays(date.rooms, main.rooms)) ? null : JSON.stringify(date.rooms),
    }
}

function equalArrays(a1, a2) {
    if (!a1 || !a2) {
        return null;
    }
    return a1.every((v, i) => v === a2[i]);
}

function defaultDate() {
    return {
        startDate: new Date(),
        endDate: new Date().addHours(1)
    }
}

Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000));
    return this;
}

module.exports = {
    fromEventDto,
    toEventDto
}
