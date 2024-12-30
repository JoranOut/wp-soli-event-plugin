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
        className: ["specialclass", dateDto.status === "PRIVATE" ? "private-event" : "",
            dateDto.is_concert ? "concert" : ""],
        extendedProps: {
            postId: dateDto.post_id,
            isConcert: dateDto.is_concert,
            postStatus: dateDto.status,
            locationId: dateDto.location_id,
            locationName: dateDto.location_name,
            locationAddress: dateDto.location_address,
        }
    }
}

function parseTime(date) {
    return new Date(date).toISOString();
}

module.exports = {
    fromEventDto
}
