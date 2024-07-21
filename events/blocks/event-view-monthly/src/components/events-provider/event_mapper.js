function fromEventDto(eventDto) {
    return eventDto ? eventDto.map(fromDateDto) : [];
}

function fromDateDto(dateDto) {
    const startDate = parseTime(dateDto.start_date)
    const endDate = parseTime(dateDto.end_date)

    return {
        id: dateDto.id,
        calendarId: 'cal1',
        title: dateDto.post_title,
        category: 'time',
        start: startDate,
        end: endDate,
        raw: {
            post_id: dateDto.post_id,
            postAuthor: dateDto.post_author,
            postExcerpt: dateDto.post_excerpt,
            postStatus: dateDto.post_status,
            featuredImage: dateDto.featured_image,
            guid: dateDto.guid,
        }
    }
}

function parseTime(date){
    return new Date(date).toISOString();
}

function fullDateDto(dateDto) {
    return {
        id: dateDto.id,
        parent: dateDto.parent,
        startDate: dateDto.start_date,
        endDate: dateDto.end_date,
        ID: dateDto.post_id,
        postAuthor: dateDto.post_author,
        postTitle: dateDto.post_title,
        postExcerpt: dateDto.post_excerpt,
        postStatus: dateDto.post_status,
        postName: dateDto.post_name,
        postModified: dateDto.post_modified,
        postParent: dateDto.post_parent,
        guid: dateDto.guid,
        postType: dateDto.post_type,
    }
}

module.exports = {
    fromEventDto
}
