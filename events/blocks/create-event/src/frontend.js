import './frontend.scss';

import {render} from '@wordpress/element';
import EventsProvider from "./components/events-provider/events-provider";
import {useState} from '@wordpress/element';

const divsToUpdate = document.querySelectorAll(".block-event-view")

divsToUpdate.forEach(function (div) {

    render(<FrontEndComponent
        postId={div.getAttribute('data-id')}
    />, div)
})


function FrontEndComponent(props) {
    const postId = props.postId;
    const [dates, setDates] = useState();

    const queryParameters = new URLSearchParams(window.location.search)
    const event_id = queryParameters.get("event") || 0;

    return (<>
        <EventsProvider
            post_id={postId}
            dates={dates}
            setDates={(newDates) => {
                if (newDates.isRepeatedDate) {
                    newDates.repeated.push(newDates.main);
                    newDates.repeated.sort((a,b) => a.date.localeCompare(b.date))
                }
                setDates(newDates);
            }}
            enableSaveButton={false}
        >
            {dates && dates.isRepeatedDate && dates.repeated.map((date, i) => {
                const selectedClass = date.id === event_id ? 'selected' : '';
                return (
                    <div key={i} className={selectedClass}>
                        <p>{date.id}</p>
                        <p>{date.date.split(' ')[0]}</p>
                        <p>{date.startTime ? date.startTime : dates.main.startTime} {date.endTime ? date.endTime : dates.main.endTime}</p>
                    </div>
                );
            })}
        </EventsProvider>
    </>)
}
