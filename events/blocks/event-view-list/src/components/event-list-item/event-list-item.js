import "./event-list-item.scss";
import DateBox from "../date-box/date-box";
import SelectedDate from "../selected-date/selected-date";

export default function EventListItem({event}) {
    return (
        <>
            {event &&
                <div className="soli-block-event-list-item">
                    <div className="image-box">
                        <DateBox date={event}/>
                        <img src={event.featuredImage}/>
                    </div>
                    <div className="event-list-content">
                        <h2>{event.title}</h2>
                        <SelectedDate date={event}/>
                        <a className="button is-secondary" href={event.url}>visit</a>
                    </div>
                </div>
            }
        </>
    );
}
