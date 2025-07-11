import './index.scss'
import {render} from '@wordpress/element';
import CalendarWrapper from "./components/calendar-wrapper/calendar-wrapper";

const divsToUpdate = document.querySelectorAll(".block-event-view-calendar")

divsToUpdate.forEach(function (div) {
    const calendarType =
        div.classList.contains("type-month") ? "month"
            : div.classList.contains("type-week") ? "week"
                : div.classList.contains("type-day") ? "day"
                    : null;

    const adjustable = div.classList.contains("adjustable");

    const onlyConcerts = div.classList.contains("only-concerts");

    const showRoomsFilter = div.classList.contains("show-rooms-filter");

    render(<CalendarWrapper className="alignwide"
                            calendarType={calendarType}
                            adjustable={adjustable}
                            onlyConcerts={onlyConcerts}
                            showRoomsFilter={showRoomsFilter}/>, div)
})
