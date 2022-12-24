import { render } from '@wordpress/element';
import CalendarWrapper from "./components/calendar-wrapper/calendar-wrapper";

const divsToUpdate = document.querySelectorAll(".block-event-view-monthly")

divsToUpdate.forEach(function(div) {
    render(<CalendarWrapper />, div)
    div.classList.remove("block-event-view-monthly")
})

function Quiz() {
    return (
        <div className="block-event-view-monthly">
            Hello from React
        </div>
    )
}
