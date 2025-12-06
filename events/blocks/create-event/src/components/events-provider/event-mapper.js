const {slugToRoomIndex} = require("../../../../../inc/values");

function fromEventDto(eventDto) {
    return eventDto ? eventDto.map(fromDateDto) : null
}

function fromDateDto(dateDto) {
    return {
        id: dateDto.id,
        startDate: dateDto.start_date,
        endDate: dateDto.end_date,
        location: fromLocationDto(dateDto),
        rooms: fromEventRoomDto(dateDto.rooms),
        status: dateDto.status,
        concertStatus: dateDto.is_concert,
        notes: dateDto.notes?.length > 0 ? dateDto.notes : null,
        adminNotes: dateDto.admin_notes?.length > 0 ? dateDto.admin_notes : null,
    }
}

function fromEventRoomDto(rooms) {
    const roomArray = JSON.parse(rooms);
    if (!roomArray){
        return null;
    }
    return roomArray.map(room => slugToRoomIndex(room));
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
        start_date: utcToLocal(new Date(date.startDate)),
        end_date: utcToLocal(new Date(date.endDate)),
        location: !date.location ? null : date.location.id,
        rooms: !date.rooms ? null : JSON.stringify(date.rooms),
        status: date.status,
        is_concert: date.concertStatus,
        notes: date.notes?.length > 0 ? date.notes : null,
        admin_notes: date.adminNotes?.length > 0 ? date.adminNotes : null
    }
}

function utcToLocal(date) {
    const localOffset = date.getTimezoneOffset();
    return date.addHours(-localOffset / 60);
}

Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}

module.exports = {
    fromEventDto,
    toEventDto
}
