import "./list-view.scss";
import {useState} from '@wordpress/element';
import EventsProvider from "../events-provider/events-provider";
import EventListItem from "../event-list-item/event-list-item";

export default function ListView() {
    const [events, setEvents] = useState();

    return (<div className="soli-block-event-list">
        <EventsProvider
            setEvents={(newEvents) => setEvents(newEvents)}
        >
            {events && events.map((event, i) => {
                return (
                    <EventListItem
                        key={i}
                        event={event}
                    />
                )
            })}
        </EventsProvider>
    </div>)
}
