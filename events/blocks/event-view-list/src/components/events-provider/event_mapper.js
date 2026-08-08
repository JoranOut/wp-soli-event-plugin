const { ROOM_SLUGS} = require("../../../../../inc/values");

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
        excerpt: dateDto.post_excerpt,
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
            rooms: getRoomIndexList(dateDto),
            location: dateDto.location_id ? {
                id: dateDto.location_id,
                name: dateDto.location_name,
                address: dateDto.location_address,
            } : null,
        }
    }
}

function getRoomClassList(dateDto){
    const rooms = JSON.parse(dateDto.rooms);
    return rooms ? rooms : [];
}

function getRoomIndexList(dateDto){
    const rooms = JSON.parse(dateDto.rooms);
    return rooms ? rooms
        .map(room => ROOM_SLUGS.indexOf(room)) : null;
}

function parseTime(date) {
    return new Date(date).toISOString();
}

module.exports = {
    fromEventDto
}
