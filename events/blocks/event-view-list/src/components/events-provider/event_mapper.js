function fromEventDto(eventDto) {
    return eventDto ? eventDto.map(fromDateDto) : [];
}

function fromDateDto(dateDto) {
    const startTime = parseTime(dateDto.date, dateDto.start_time ? dateDto.start_time : dateDto.parent_start_time,)
    const endTime = parseTime(dateDto.date, dateDto.end_time ? dateDto.end_time : dateDto.parent_end_time,)

    return {
        id: dateDto.id,
        parent: dateDto.parent,
        date: dateDto.date,
        startTime: startTime,
        endTime: endTime,
        featuredImageId: dateDto.featured_image_id,
        postId: dateDto.ID,
        postTitle: dateDto.post_title,
        postExcerpt: dateDto.post_excerpt,
        postStatus: dateDto.post_status,
    }
}

function parseTime(date, time) {
    return date.substring(0, 10) + "T" + time;
}

module.exports = {
    fromEventDto
}
