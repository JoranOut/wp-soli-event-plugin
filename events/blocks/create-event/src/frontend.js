import './frontend.scss';

import {render} from '@wordpress/element';
import EventsProvider from "./components/events-provider/events-provider";
import {useState} from '@wordpress/element';
import SelectedDate from "./components/selected-date/selected-date";
import LocationProvider from "./components/location-provider/location-provider";

const divsToUpdate = document.querySelectorAll(".block-event-view")

divsToUpdate.forEach(function (div) {

    render(<FrontEndComponent
        postId={div.getAttribute('data-id')}
    />, div)
})

function FrontEndComponent(props) {
    const postId = props.postId;
    const [dates, setDates] = useState();
    const [location, setLocation] = useState();

    const queryParameters = new URLSearchParams(window.location.search)
    const event_id = queryParameters.get("event") || 0;

    return (<>
        <EventsProvider
            post_id={postId}
            dates={dates}
            setDates={(newDates) => {
                if (newDates?.length > 1) {
                    newDates.push(newDates);
                    newDates.sort((a,b) => a.start_date.localeCompare(b.start_date))
                }
                setDates(newDates);
            }}
            enableSaveButton={false}
        >
            <SelectedDate
                event_id={event_id}/>

            {dates &&
                dates.map((date, i) => {
                const selectedClass = date.id === event_id ? 'selected' : '';
                return (
                    <div key={i} className={selectedClass}>
                        <p>{date.id}</p>
                        <p>{date.startDate.split(' ')[0]}</p>
                        <p>{date.startDate} {date.endDate}</p>
                    </div>
                );
            })}
        </EventsProvider>
        <LocationProvider
            post_id={postId}
            location = {location}
            setLocation={(newLocation) => {
                setLocation(newLocation)
            }}
            enableSaveButton={false}
        >
            <p>{postId}</p>
            <p>{location.id}</p>
            <p>{location.address}</p>
            <p>{location.rooms}</p>
        </LocationProvider>
    </>)
}
