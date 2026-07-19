import "./event-list-item.scss";
import { __, sprintf } from '@wordpress/i18n';
import dayjs from "dayjs";
import "dayjs/locale/nl";

const EXCERPT_LIMIT = 200;

function truncateExcerpt(text) {
    if (!text || text.length <= EXCERPT_LIMIT) {
        return text;
    }
    const cut = text.slice(0, EXCERPT_LIMIT);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > 0 ? lastSpace : EXCERPT_LIMIT).trimEnd()}…`;
}

export default function EventListItem({event}) {
    if (!event) {
        return null;
    }

    dayjs.locale("nl");
    const startDate = dayjs(event.start);
    const location = event.extendedProps?.location;
    const rooms = event.extendedProps?.rooms;

    const locationName = location?.name ?? (rooms ? "Muziekcentrum Soli" : null);
    const description = [
        sprintf(__('%s hrs', 'soli-event'), startDate.format("HH:mm")),
        locationName,
        truncateExcerpt(event.excerpt),
    ].filter(Boolean).join(" · ");

    return (
        <li className="soli-block-event-list-item">
            <div className="event-list-date">{startDate.format("dd DD.MM.YY")}</div>
            <div className="event-list-content">
                <p className="event-list-title">
                    <a className="soli-rowlink" href={event.url}>{event.title}</a>
                </p>
                {description && <p className="event-list-description">{description}</p>}
            </div>
        </li>
    );
}
