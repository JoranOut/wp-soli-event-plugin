import "./calendar-wrapper.scss";
import {useState, useRef} from '@wordpress/element';
import EventsProvider from "../events-provider/events-provider";
import Calendar from "@toast-ui/react-calendar";
import '@toast-ui/calendar/dist/toastui-calendar.min.css';
import EventDetailPopUp from "../event-detail-pop-up/event-detail-pop-up";

export default function CalendarWrapper() {
    const [events, setEvents] = useState();
    const [selectedEvent, setSelectedEvent] = useState();
    const [selectedEventBox, setSelectedEventBox] = useState();
    const calendarRef = useRef();
    const calendars = [{id: 'cal1', name: 'Personal'}];

    const getEventBlock = (el) => {
        while (el) {
            if (el.classList.contains("toastui-calendar-weekday-event-block")) {
                return el;
            }
            el = el.parentElement
        }
    }

    return (<div className="soli-block-create-event">
        <EventsProvider
            events={events}
            changeView={(month) => {
                if(calendarRef.current){
                    calendarRef.current.calendarInstance.setDate(new Date(month+"-01"));
                }
            }}
            setEvents={setEvents}
        >
            <Calendar
                view="month"
                month={{
                    dayNames: ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'],
                    isAlways6Weeks: false,
                    startDayOfWeek: 1,
                }}
                ref={calendarRef}
                calendars={calendars}
                events={events}
                gridSelection={false}
                isReadOnly={true}
                useCreationPopup={false}
                useDetailPopup={false}
                onClickEvent={(e) => {
                    console.log(e.event)
                    setSelectedEvent(e.event)
                    setSelectedEventBox(getEventBlock(e.nativeEvent.target).getBoundingClientRect())
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
