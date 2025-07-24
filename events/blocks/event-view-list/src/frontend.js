import { render } from '@wordpress/element';
import ListView from "./components/list-view/list-view";

const divsToUpdate = document.querySelectorAll(".block-event-view-list")

divsToUpdate.forEach(function(div) {
    render(<ListView
                eventsPerPage={div.getAttribute('data-events_per_page') || 10}
                showNavigation={div.getAttribute('data-navigation') === 'true'}
        />, div)
    div.classList.remove("block-event-view-list")
})
