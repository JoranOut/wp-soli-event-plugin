const {ROOM_NAMES, ROOM_SLUGS} = require("../../../../../inc/values");

function fromEventDto(eventDto) {
    return eventDto ? eventDto.map(fromDateDto) : [];
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
        featuredImage: dateDto.featured_image,
        featuredImageId: dateDto.featured_image_id,
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
            locationId: dateDto.location_id,
            locationName: dateDto.location_name,
            locationAddress: dateDto.location_address,
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

module.exports = {
    fromEventDto
}
