import './event-list-item.scss';

import {addEvent, deleteEvent} from "../../redux/events-slice";
import {changeViewDate} from "../../redux/calendar-slice";
import {useDispatch} from "react-redux";
import copySVG from "../../../../../../inc/assets/img/icons/copy.svg";
import focusSVG from "../../../../../../inc/assets/img/icons/gps.svg";
import deleteSVG from "../../../../../../inc/assets/img/icons/delete.svg";
import EventListItemEditor from "../event-list-item-editor/event-list-item-editor";
import {Button} from "@mui/material";
import {v4 as uuidv4} from "uuid";

export default function EventListItem({event}) {
    const dispatch = useDispatch();
    const handleDelete = (id) => {
        dispatch(deleteEvent(id));
    };

    const handleViewDate = (date) => {
        dispatch(changeViewDate(date.toISOString()));
    }

    const handleCopy = (event) => {
        dispatch(addEvent({
            ...event,
            beginDate: event.beginDate.toISOString(),
            endDate: event.endDate.toISOString(),
            id: uuidv4()}));
    }

    return (
        <div className="event-list-item">
            <Button
                className="focus-button"
                variant="secondary"
                onClick={() => handleViewDate(event.beginDate)}>
                <img src={focusSVG}/>
                View</Button>
            <EventListItemEditor
                event={event}
            />
            <Button
                className="copy-button"
                variant="secondary"
                onClick={() => handleCopy(event)}>
                <img src={copySVG}/>
                Copy
            </Button>
            <Button
                className="delete-button"
                variant="secondary"
                onClick={() => handleDelete(event.id)}>
                <img src={deleteSVG}/>
                Delete</Button>
        </div>);
}
