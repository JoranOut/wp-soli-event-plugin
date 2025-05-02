import './calendar-preview.scss';

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from '@fullcalendar/timegrid'
import nlLocale from '@fullcalendar/core/locales/nl';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import {useSelector} from "react-redux";
import {selectViewDate} from "../../redux/calendar-slice";
import {useEffect, useRef, useState} from "react";
import InternalEventsProvider from "../events-provider/internal-events-provider";
import {selectEvents} from "../../redux/events-slice";
import {splitEventsOnRooms} from "../events-provider/event-mapper";

function dateToDayRange(date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const nextDay = new Date(startOfDay);
    nextDay.setUTCDate(startOfDay.getUTCDate() + 1);

    return {
        start: startOfDay,
        end: nextDay
    }
}

function reservationToCalendarEvent(reservation) {
    return {
        id: reservation.id,
        post_title: "Reservering",
        start: reservation.beginDate,
        end: reservation.endDate,
        rooms: JSON.stringify(reservation.rooms),
    }
}

function convertPostTitle(event) {
    return {...event, title: event.post_title};
}

export default function CalendarPreview() {
    const selectedDate = useSelector(selectViewDate);
    const [range, setRange] = useState(dateToDayRange(selectedDate));

    const rawReservations = useSelector(selectEvents);
    const reservations = rawReservations.map(reservationToCalendarEvent);
    const splitRoomsReservations = splitEventsOnRooms(reservations);
    const processedReservations = splitRoomsReservations.map(convertPostTitle);

    const calendarRef = useRef(null);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (calendarRef) {
            calendarRef.current.getApi().gotoDate(selectedDate);
        }
        setRange(dateToDayRange(selectedDate));
    }, [selectedDate]);

    const handleDates = (rangeInfo) => {
        setRange(rangeInfo)
    }

    const updateEvents = (loadedEvents) => {
        setEvents(loadedEvents);
    }

    return (
        <InternalEventsProvider
            range={range}
            setEvents={updateEvents}
            >
            <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, bootstrap5Plugin]}
                initialDate={selectedDate}
                initialView={"timeGridDay"}
                themeSystem="bootstrap5"
                scrollTime={"10:00:00"}
                slotDuration={"00:30:00"}
                slotLabelInterval={"01:00"}
                headerToolbar={{
                    left: 'title',
                }}
                datesSet={handleDates}
                weekends={true}
                locale={nlLocale}
                height={"100%"}
                events={[...events, ...processedReservations]}
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
        </InternalEventsProvider>
    );
}
