import "./list-view.scss";
import {useState} from '@wordpress/element';
import EventsProvider from "../events-provider/events-provider";
import EventListItem from "../event-list-item/event-list-item";
import PaginationNav from "../nav/pagination-nav";

export default function ListView({eventsPerPage, showNavigation}) {
    const [events, setEvents] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(10);

    return (<div className="soli-block-event-list">
        <EventsProvider
            setEvents={(newEvents) => setEvents(newEvents)}
            eventsPerPage={eventsPerPage}
            currentPage={currentPage}
            setTotalPages={setTotalPages}
        >
            <div className="soli-event-list">
                {events && events.map((event, i) => {
                    return (
                        <EventListItem
                            key={i}
                            event={event}
                        />
                    )
                })}
            </div>
            {showNavigation &&
                <PaginationNav
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                />
            }
        </EventsProvider>
    </div>)
}
