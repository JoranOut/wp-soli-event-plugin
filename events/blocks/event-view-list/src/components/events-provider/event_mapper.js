function fromEventDto(eventDto) {
    return eventDto ? eventDto.map(fromDateDto) : [];
}

function fromDateDto(dateDto) {
    const startDate = parseTime(dateDto.startDate)
    const endDate = parseTime(dateDto.endDate)

    return {
        id: dateDto.id,
        parent: dateDto.parent,
        startDate: startDate,
        endDate: endDate,
        featuredImageId: dateDto.featured_image_id,
        postId: dateDto.ID,
        postTitle: dateDto.post_title,
        postExcerpt: dateDto.post_excerpt,
        postStatus: dateDto.post_status,
    }
}

function parseTime(date, time) {
    return date.toISOString();
}

module.exports = {
    fromEventDto
}
