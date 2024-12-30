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

export default function CalendarWrapper({calendarType, adjustable}) {
    const [events, setEvents] = useState();
    const [selectedEvent, setSelectedEvent] = useState();
    const [selectedEventBox, setSelectedEventBox] = useState();
    const [range, setRange] = useState();
    const calendarRef = useRef();

    const initialView = calendarType === "day" ? "timeGridDay" :
        calendarType === "week" ? "timeGridWeek" :
            "dayGridMonth";

    const handleDates = (rangeInfo) => {
        setRange(rangeInfo)
    }

    return (<div className="soli-block-view-calendar">
        <EventsProvider
            range={range}
            setEvents={setEvents}
        >
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
