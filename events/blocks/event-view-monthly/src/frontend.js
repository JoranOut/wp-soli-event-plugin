import { render } from '@wordpress/element';
import CalendarWrapper from "./components/calendar-wrapper/calendar-wrapper";

const divsToUpdate = document.querySelectorAll(".block-event-view-monthly")

divsToUpdate.forEach(function(div) {
    render(<CalendarWrapper className="alignwide" />, div)
})
