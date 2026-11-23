import "./calendar-wrapper.scss";
import {useState, useRef, useEffect} from '@wordpress/element';
import EventsProvider from "../events-provider/events-provider";
import EventDetailPopUp from "../event-detail-pop-up/event-detail-pop-up";
import FullCalendar, {joinClassNames} from '@fullcalendar/react'
import classicThemePlugin from '@fullcalendar/react/themes/classic'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import listPlugin from '@fullcalendar/react/list'
import nlLocale from '@fullcalendar/react/locales/nl';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';

import CalendarFilter from "../calendar-filter/calendar-filter";
import useSmallScreen from "../use-small-screen/use-small-screen";
import {ROOM_SLUGS} from "../../../../../inc/values";

// FullCalendar 7 no longer renders semantic fc-* classes, so the agenda skin
// in calendar-wrapper.scss hooks onto these soli-cal-* classes instead.
const SOLI_CLASS_HOOKS = {
    toolbarClass: 'soli-cal-toolbar',
    toolbarSectionClass: ({name}) => `soli-cal-toolbar-${name}`,
    toolbarTitleClass: 'soli-cal-title',
    buttonGroupClass: 'soli-cal-button-group',
    buttonClass: ({name, isSelected}) => joinClassNames(
        'soli-cal-button',
        `soli-cal-button-${name}`,
        isSelected && 'soli-cal-button-active',
    ),
    viewClass: 'soli-cal-view',
    dayHeaderClass: 'soli-cal-day-header',
    dayHeaderInnerClass: 'soli-cal-day-header-inner',
    dayHeaderAlign: 'start',
    dayCellClass: ({isToday, isOther}) => joinClassNames(
        'soli-cal-day',
        isToday && 'soli-cal-day-today',
        isOther && 'soli-cal-day-other',
    ),
    dayCellTopClass: 'soli-cal-day-top',
    dayCellTopInnerClass: 'soli-cal-day-number',
    eventClass: 'soli-cal-event',
    rowEventClass: 'soli-cal-row-event',
    eventTitleClass: 'soli-cal-event-title',
    moreLinkClass: 'soli-cal-more-link',
    listDayHeaderClass: 'soli-cal-list-day-header',
    listDayHeaderInnerClass: 'soli-cal-list-day-header-inner',
    listItemEventClass: 'soli-cal-list-event',
    listItemEventTimeClass: 'soli-cal-list-event-time',
    listItemEventTitleClass: 'soli-cal-list-event-title',
    noEventsClass: 'soli-cal-no-events',
};

// Phones get a month list: a grid has no room for event titles there.
const SMALL_SCREEN_VIEW = 'listMonth';

const setDefaultFilters = (onlyConcerts, onlyInternal) => {
    const concertFilter = onlyConcerts ? ["only-concerts"] : [];
    const internalFilter = onlyInternal ? ["only-internal"] : [];
    return [...concertFilter, ...internalFilter, ...ROOM_SLUGS];
}

export default function CalendarWrapper({calendarType, adjustable, onlyConcerts, showRoomsFilter, showCategoryFilter = false, showHiddenInCalendar = false}) {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState();
    const [selectedEventBox, setSelectedEventBox] = useState();
    const [range, setRange] = useState();
    const [filters, setFilters] = useState(setDefaultFilters(onlyConcerts, showRoomsFilter));
    const [categoryIds, setCategoryIds] = useState([]);
    const calendarRef = useRef();
    const isSmallScreen = useSmallScreen();

    const defaultView = calendarType === "day" ? "timeGridDay" :
        calendarType === "week" ? "timeGridWeek" :
            "dayGridMonth";
    const [largeScreenView, setLargeScreenView] = useState(defaultView);

    // Remembers the view picked on a large screen so rotating or resizing
    // back from phone width restores it instead of the default.
    useEffect(() => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        const target = isSmallScreen ? SMALL_SCREEN_VIEW : largeScreenView;
        if (api.view.type !== target) {
            api.changeView(target);
        }
        if (isSmallScreen) {
            setSelectedEvent(null);
        }
    }, [isSmallScreen]);

    const visibleEvents = showHiddenInCalendar
        ? events
        : events.filter(event => !event.extendedProps.hideInCalendar);

    const handleDates = (rangeInfo) => {
        setRange(rangeInfo)
        if (!isSmallScreen && rangeInfo.view.type !== SMALL_SCREEN_VIEW) {
            setLargeScreenView(rangeInfo.view.type);
        }
    }

    // On a phone the popup has no room next to the event, so the click
    // follows the event's own link.
    const handleClick = (info) => {
        if (isSmallScreen) {
            return;
        }
        info.jsEvent.preventDefault()
        setSelectedEvent(info.event);
        const box = info.el.getBoundingClientRect();
        setSelectedEventBox(box);
    }

    return (<div className={`soli-block-view-calendar ${filters.join(' ')}`}>
        <EventsProvider
            range={range}
            setEvents={setEvents}
            filters={filters}
            categoryIds={categoryIds}
        >
            <CalendarFilter
                filters={filters}
                onChange={setFilters}
                showRoomFilters={showRoomsFilter}
                showCategoryFilter={showCategoryFilter}
                categoryIds={categoryIds}
                onCategoryChange={setCategoryIds}
            />

            <FullCalendar
                ref={calendarRef}
                plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, listPlugin]}
                initialView={isSmallScreen ? SMALL_SCREEN_VIEW : defaultView}
                headerToolbar={isSmallScreen ? {
                    left: 'title',
                    right: 'prev,today,next'
                } : {
                    left: 'prev,next today',
                    center: 'title',
                    right: adjustable ? 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' : ''
                }}
                // The plain month calendar and the phone list size to their
                // content, like the agenda-page design; the adjustable and
                // week/day variants keep a viewport-bound height so timeGrid
                // views can scroll.
                height={isSmallScreen || (calendarType === 'month' && !adjustable)
                    ? 'auto'
                    : 'max(calc(100vh - 250px), 500px)'}
                scrollTime="11:00:00"
                datesSet={handleDates}
                eventClick={handleClick}
                weekends={true}
                events={visibleEvents}
                locale={nlLocale}
                dayMaxEvents={3}
                // Block-style pills everywhere (never dot events), matching
                // the agenda design.
                eventDisplay="block"
                {...SOLI_CLASS_HOOKS}
                views={{
                    dayGrid: {
                        // Title-only pills, matching the agenda design.
                        displayEventTime: false,
                    }
                }}
            />
            {selectedEvent && !isSmallScreen &&
                <EventDetailPopUp
                    boundingBox={selectedEventBox}
                    event={selectedEvent}
                    clearEvent={() => setSelectedEvent(null)}
                />
            }
        </EventsProvider>
    </div>)
}
