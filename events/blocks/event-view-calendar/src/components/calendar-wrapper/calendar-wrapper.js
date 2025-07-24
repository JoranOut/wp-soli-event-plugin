import "./calendar-wrapper.scss";
import {useState, useRef} from '@wordpress/element';
import EventsProvider from "../events-provider/events-provider";
import EventDetailPopUp from "../event-detail-pop-up/event-detail-pop-up";
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/list'
import listPlugin from '@fullcalendar/timegrid'
import nlLocale from '@fullcalendar/core/locales/nl';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import CalendarFilter from "../calendar-filter/calendar-filter";
import {ROOM_SLUGS} from "../../../../../inc/values";

const setDefaultFilters = (onlyConcerts, onlyInternal) => {
    const concertFilter = onlyConcerts ? ["only-concerts"] : [];
    const internalFilter = onlyInternal ? ["only-internal"] : [];
    return [...concertFilter, ...internalFilter, ...ROOM_SLUGS];
}

export default function CalendarWrapper({calendarType, adjustable, onlyConcerts, showRoomsFilter}) {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState();
    const [selectedEventBox, setSelectedEventBox] = useState();
    const [range, setRange] = useState();
    const [filters, setFilters] = useState(setDefaultFilters(onlyConcerts, showRoomsFilter));
    const calendarRef = useRef();

    const initialView = calendarType === "day" ? "timeGridDay" :
        calendarType === "week" ? "timeGridWeek" :
            "dayGridMonth";

    const handleDates = (rangeInfo) => {
        setRange(rangeInfo)
    }

    return (<div className={`soli-block-view-calendar ${filters.join(' ')}`}>
        <EventsProvider
            range={range}
            setEvents={setEvents}
            filters={filters}
        >
            <CalendarFilter
                filters={filters}
                onChange={setFilters}
                showRoomFilters={showRoomsFilter}
            />

            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, bootstrap5Plugin]}
                initialView={initialView}
                themeSystem="bootstrap5"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: adjustable ? 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' : ''
                }}
                height={'max(calc(100vh - 250px), 500px)'}
                scrollTime="10:00:00"
                datesSet={handleDates}
                weekends={true}
                events={events}
                locale={nlLocale}
                views={{
                    dayGrid: {
                        eventTimeFormat:
                            {
                                hour: 'numeric',
                                minute: '2-digit',
                                omitZeroMinute: false,
                                meridiem: 'narrow'
                            }
                    }
                }}
            />
            {selectedEvent &&
                <EventDetailPopUp
                    boundingBox={selectedEventBox}
                    event={selectedEvent}
                    clearEvent={() => setSelectedEvent(null)}
                />
            }
        </EventsProvider>
    </div>)
}
