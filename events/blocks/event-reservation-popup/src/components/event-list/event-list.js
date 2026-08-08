import './event-list.scss';

import {__} from '@wordpress/i18n';
import {Button} from "@wordpress/components"
import {useSelector, useDispatch} from 'react-redux';

import EventListItem from "../event-list-item/event-list-item";
import addSVG from "../../../../../../inc/assets/img/icons/add circle.svg";
import {addEvent, selectEvents} from "../../redux/events-slice";
import {v4 as uuidv4} from "uuid";

function addHours(date, hours) {
    if (hours) {
        date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
    }
    return date;
}

function getDefaultDate(h) {
    return addHours(new Date(), h).toISOString();
}

export default function EventList(){
    const dispatch = useDispatch();
    const events = useSelector(selectEvents);

    const newEvent = () => {
        dispatch(addEvent({
            id: uuidv4(),
            beginDate: getDefaultDate(),
            endDate: getDefaultDate(1),
            rooms: []}));
    }

    return (
        <div className="event-list">
            <h2>{__('Time slots to reserve', 'soli-event')}</h2>
            {events.length === 0 && (
                <p className="event-list-empty">
                    {__('No time slots yet. Click "new" to add your first one.', 'soli-event')}
                </p>
            )}
            {events.map((event) => (
                    <EventListItem
                        key={event.id}
                        event={event}/>
                ))}
            <Button
                className="new-event-button"
                variant="secondary"
                onClick={newEvent}>
                <img src={addSVG}/>
                {__('new', 'soli-event')}
            </Button>
        </div>
    );
};
