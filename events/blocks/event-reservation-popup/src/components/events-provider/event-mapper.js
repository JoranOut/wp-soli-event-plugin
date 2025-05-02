const {ROOM_NAMES, ROOM_SLUGS, ROOM_COLORS} = require("../../../../../inc/values");

function fromEventDto(eventDto) {
    return eventDto ? eventDto.filter(e => e.rooms).map(fromDateDto) : [];
}

function fromDateDto(dateDto) {
    const startDate = parseTime(dateDto.start_date)
    const endDate = parseTime(dateDto.end_date)

    return {
        id: dateDto.id,
        title: dateDto.post_title,
        start: startDate,
        end: endDate,
        url: dateDto.guid,
        color: dateDto.color,
        className: [
            "soli-event",
            dateDto.status === "PRIVATE" ? "private-event" : "",
            dateDto.is_concert ? "concert-event" : "",
            ...getRoomClassList(dateDto)
        ],
        extendedProps: {
            postId: dateDto.post_id,
            isConcert: dateDto.is_concert,
            postStatus: dateDto.status,
            rooms: getRoomNameList(dateDto),
        }
    }
}

function getRoomClassList(dateDto){
    const rooms = JSON.parse(dateDto.rooms);
    return rooms ? rooms.map(room => ROOM_SLUGS[room]) : [];
}

function getRoomNameList(dateDto){
    const rooms = JSON.parse(dateDto.rooms);
    return rooms ? rooms.map(room => ROOM_NAMES[room]) : [];
}

function parseTime(date) {
    return new Date(date).toISOString();
}

function splitEventsOnRooms(events) {
    if (!events) {
        return [];
    }
    return events
        .flatMap(event => {
            if (!event.rooms) {
                return event;
            }
            const rooms = JSON.parse(event.rooms);
            if (!rooms || rooms.length === 0) {
                return event;
            }
            return rooms.map((room, index) => {
                return {
                    ...event,
                    id: `${event.id}.${index}`,
                    post_title: `${event.post_title} - ${room}`,
                    rooms: JSON.stringify([room]),
                    color: ROOM_COLORS[room]
                }
            })
        })
}


module.exports = {
    fromEventDto,
    splitEventsOnRooms
}
