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

    return (<>
        <EventsProvider
            post_id={postId}
            dates={dates}
            setDates={(newDates) => {
                if (newDates.isRepeatedDate) {
                    newDates.repeated.push(newDates.main);
                }
                setDates(newDates);
            }}
            enableSaveButton={false}
        >
            {dates && dates.isRepeatedDate && dates.repeated.map((date, i) => {
                const selectedClass = i === 0 ? 'selected' : '';
                return (
                    <div key={i} className={selectedClass}>
                        <p>{date.date.split(' ')[0]}</p>
                        <p>{date.startTime ? date.startTime : dates.main.startTime} {date.endTime ? date.endTime : dates.main.endTime}</p>
                    </div>
                );
            })}
        </EventsProvider>
    </>)
}
