import './frontend.scss';
import {render} from '@wordpress/element';
import SelectedDate from "./components/selected-date/selected-date";
import FrontendEventsProvider from "./components/events-provider/events-provider";
import {useEventState} from "./components/events-context";

const divsToUpdate = document.querySelectorAll(".block-event-view")

divsToUpdate.forEach(function (div) {
    render(<FrontEndComponent
        postId={div.getAttribute('data-id')}
    />, div)
})

function FrontendContent() {
    const {events} = useEventState();

    const queryParameters = new URLSearchParams(window.location.search);
    const event_id = queryParameters.get("event") || null;

    const getSelectedEvent = () => {
        if (!events?.length) return null;

        let event = events.find(d => d.id === event_id);

        if (!event) {
            const currentDate = new Date();
            const nearest = events
                .filter(d => new Date(d.startDate) > currentDate)
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            event = nearest.length > 0 ? nearest[0] : null;
        }

        if (!event) {
            event = events[events.length - 1];
        }

        return event;
    };

    const selectedDate = getSelectedEvent();

    return (
        <>
            {selectedDate && <SelectedDate date={selectedDate}/>}
        </>
    );
}

function FrontEndComponent({postId}) {
    return (
        <FrontendEventsProvider post_id={postId}>
            <FrontendContent/>
        </FrontendEventsProvider>
    );
}
