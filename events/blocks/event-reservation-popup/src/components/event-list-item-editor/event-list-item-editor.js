import './event-list-item-editor.scss';

import {useState} from '@wordpress/element';
import {useDispatch} from "react-redux";
import RoomsDropdown from "../rooms-dropdown/rooms-dropdown";
import DateRangePicker from "../daterange-picker/daterange-picker";
import {updateEvent} from "../../redux/events-slice";

export default function EventListItemEditor({event}) {
    const dispatch = useDispatch();
    const [editedEvent, setEditedEvent] = useState(event);

    const updateRange = (date) => {
        const newEvent = {...editedEvent, beginDate: date.startDate, endDate: date.endDate};
        setEditedEvent(newEvent);
        pushChange(newEvent);
    }

    const updateRooms = (rooms) => {
        const newEvent = {...editedEvent, rooms: rooms};
        setEditedEvent(newEvent);
        pushChange(newEvent);
    }

    const pushChange = (event) => {
        const sanitizedEvent = {...event, beginDate: event.beginDate.toISOString(), endDate: event.endDate.toISOString()};
        dispatch(updateEvent(sanitizedEvent));
    }

    return (
        <div className="event-list-item-editor">
            <DateRangePicker
                date={event.beginDate ? {startDate: event.beginDate, endDate: event.endDate} : null}
                minimalDate={new Date()}
                updateDate={(date) => updateRange(date)}
                style="grid"
            />
            <RoomsDropdown
                rooms={event.rooms}
                onChange={(rooms) => updateRooms(rooms)}
            />
        </div>
    )
}
