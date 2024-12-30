import './date-list-item.scss';
import DateRangePicker from "../daterange-picker/daterange-picker";
import {useState, useEffect} from '@wordpress/element';
import LocationPicker from "../location-picker/location-picker";
import dayjs from "dayjs";
import TimeGeneratorModalButton from "../time-generator-modal-button/time-generator-modal-button";
import CopyButton from "../copy-button/copy-button";
import DeleteButton from "../delete-button/delete-button";
import EventStatusSelector from "../event-status-selector/event-status-selector";
import NotesEditor from "../notes-editor/notes-editor";
import ConcertStatusSwitch from "../concert-status-switch/concert-status-switch";

function DateListItem(props) {
    const [date, setDate] = useState(props.date)

    const updateLocation = (rooms, location) => {
        const updatedDate = {...date, location: location ? {...location} : null, rooms: rooms ? [...rooms] : null}; // Create a new copy of the date with updated location and rooms
        setDate(updatedDate);
        props.updateDate(updatedDate);
    }

    const updateStatus = (status) => {
        const updatedDate = {...date, status}; // Create a new copy of the date with updated location and rooms
        setDate(updatedDate);
        props.updateDate(updatedDate);
    }

    const updateConcertStatus = (concertStatus) => {
        const updatedDate = {...date, concertStatus}; // Create a new copy of the date with updated location and rooms
        setDate(updatedDate);
        props.updateDate(updatedDate);
    }

    const updateNotes = (notes) => {
        const updatedDate = {...date, notes}; // Create a new copy of the date with updated location and rooms
        setDate(updatedDate);
        props.updateDate(updatedDate);
    }

    const updateDate = (newDate) => {
        const updatedDate = {...date, ...newDate};
        setDate(updatedDate);
        props.updateDate(updatedDate);
    }

    const addGeneratedDates = (dates) => {
        props.addGeneratedDates(dates);
    }

    const copyDate = () => {
        const {id: _, ...cleanCopy} = date;
        props.addDateCopy(cleanCopy);
    }

    useEffect(() => {
        setDate(props.date); // Update the date state when props.date changes
    }, [props.date]);

    let today = dayjs();

    return (
        <div className={['date-list-item', dayjs(date.endDate).isAfter(today) ? "future" : "past"].join(' ')}>
            <DateRangePicker
                date={date}
                updateDate={(date) => updateDate(date)}
                style="line"
            />
            <LocationPicker
                location={date.location}
                rooms={date.rooms}
                onChange={(rooms, location) => updateLocation(rooms, location)}
            />

            <NotesEditor
                size={"small"}
                notes={date.notes}
                onChange={(notes) => updateNotes(notes)}
            />

            <EventStatusSelector
                status={date.status}
                onChange={(status) => updateStatus(status)}
            />

            <ConcertStatusSwitch
                concertStatus={date.concertStatus}
                onChange={(status) => updateConcertStatus(status)}
            />

            <CopyButton onClick={() => copyDate()}/>

            <TimeGeneratorModalButton
                date={date}
                onSubmit={(dates) => addGeneratedDates(dates)}/>

            <DeleteButton
                onClick={() => props.onDelete()}/>
        </div>
    );
}

export default DateListItem;
