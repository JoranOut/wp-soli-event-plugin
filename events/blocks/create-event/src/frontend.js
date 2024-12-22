import './frontend.scss';

import {render} from '@wordpress/element';
import {useState} from '@wordpress/element';
import SelectedDate from "./components/selected-date/selected-date";
import EventsProvider from "./components/events-provider/events-provider";

const divsToUpdate = document.querySelectorAll(".block-event-view")

divsToUpdate.forEach(function (div) {

    render(<FrontEndComponent
        postId={div.getAttribute('data-id')}
    />, div)
})

function FrontEndComponent(props) {
    const postId = props.postId;
    const [dates, setDates] = useState();
    const [selectedDate, setSelectedDate] = useState();
    const [location, setLocation] = useState();

    const queryParameters = new URLSearchParams(window.location.search)
    const event_id = queryParameters.get("event") || null;

    const updateDates = (newDates) => {
        const currentDate = new Date();
        let event = newDates.find(d => d.id === event_id);

        if (!event){
            const nearest = newDates
                .filter(d => new Date(d.startDate) > currentDate)
                .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
            event = nearest.length > 0 ? nearest[0] : null;
        }
        if (!event){
            event = newDates[newDates.length - 1];
        }

        setSelectedDate(event);
        setLocation(event?.location);
        setDates(newDates);
    };

    return (<>
        <EventsProvider
            post_id={postId}
            dates={dates}
            setDates={(newDates) => {
                if (newDates?.length > 1) {
                    newDates.push(newDates);
                }
                updateDates(newDates);
            }}
            enableSaveButton={false}
        >
            {selectedDate &&
                <SelectedDate date={selectedDate}/>}

            {/*{dates &&*/}
            {/*    dates.map((date, i) => {*/}
            {/*        const selectedClass = date.id === event_id ? 'selected' : '';*/}
            {/*        return (*/}
            {/*            <div key={i} className={selectedClass}>*/}
            {/*                <p>{date?.id}</p>*/}
            {/*                <p>{date?.startDate?.split(' ')[0]}</p>*/}
            {/*                <p>{date?.startDate} {date?.endDate}</p>*/}
            {/*            </div>*/}
            {/*        );*/}
            {/*    })}*/}
        </EventsProvider>
        {/*<LocationProvider
            post_id={postId}
            location={location}
            setLocation={(newLocation) => {
                setLocation(newLocation)
            }}
            enableSaveButton={false}
        >
            <p>{postId}</p>
            <p>{location?.id}</p>
            <p>{location?.address}</p>
            <p>{location?.rooms}</p>
        </LocationProvider>*/}
    </>)
}
