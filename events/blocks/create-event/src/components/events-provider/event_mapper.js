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
        date: dateDto.date,
        startTime: dateDto.start_time ? dateDto.start_time.slice(0, -3) : null,
        endTime: dateDto.end_time ? dateDto.end_time.slice(0, -3) : null
    }
}

function toEventDto(event) {
    return {
        main: toDateDto(event.main ?? new Date()),
        repeated: event.repeated && event.isRepeatedDate ? event.repeated.map((e) => toDateDto(e, event.main)) : null
    }
}

function toDateDto(date, main) {
    return {
        id: date.id,
        date: date.date,
        start_time: !date.startTime || (main && date.startTime === main.startTime) ? null : date.startTime + ":00",
        end_time: !date.endTime || (main && date.endTime === main.endTime) ? null : date.endTime + ":00"
    }
}

function defaultDate() {
    return {
        date: new Date(),
        startTime: new Date().getHours() + ":" + new Date().getMinutes(),
        endTime: new Date().getHours() + 1 + ":" + new Date().getMinutes()
    }
}

module.exports = {
    fromEventDto,
    toEventDto
}
