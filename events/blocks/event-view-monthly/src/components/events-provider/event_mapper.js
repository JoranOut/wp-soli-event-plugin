function fromEventDto(eventDto) {
    return eventDto ? eventDto.map(fromDateDto) : [];
}

function fromDateDto(dateDto) {
    const startTime = parseTime(dateDto.date, dateDto.start_time ? dateDto.start_time : dateDto.parent_start_time,)
    const endTime = parseTime(dateDto.date, dateDto.end_time ? dateDto.end_time : dateDto.parent_end_time,)

    return {
        id: dateDto.id,
        calendarId: 'cal1',
        title: dateDto.post_title,
        category: 'time',
        start: startTime,
        end: endTime,
        raw: {
            post_id: dateDto.ID,
            postAuthor: dateDto.post_author,
            postExcerpt: dateDto.post_excerpt,
            postStatus: dateDto.post_status,
            featuredImage: dateDto.featured_image,
            guid: dateDto.guid,
        }
    }
}

function parseTime(date, time){
    return date.substring(0, 10) + "T" + time;
}

function fullDateDto(dateDto) {
    return {
        id: dateDto.id,
        parent: dateDto.parent,
        date: dateDto.date,
        starTime: dateDto.start_time ? dateDto.start_time : dateDto.parent_start_time,
        endTime: dateDto.end_time ? dateDto.end_time : dateDto.parent_end_time,
        ID: dateDto.ID,
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
