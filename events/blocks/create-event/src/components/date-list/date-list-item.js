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
import MoreDropdown from "../more-dropdown/more-dropdown";
import ImageButton from "../image-button/image-button";
import settingsIcon from '../../../../../../inc/assets/img/icons/settings.svg';
import AdminNotesEditor from "../admin-notes-editor/admin-notes-editor";

function DateListItem(props) {
    const [date, setDate] = useState(props.date)
    const [active, setActive] = useState(false);

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

    const updateAdminNotes = (adminNotes) => {
        const updatedDate = {...date, adminNotes}; // Create a new copy of the date with updated location and rooms
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
        <div className={['date-list-item', dayjs(date.endDate).isAfter(today) ? "future" : "past", active ? "active" : ""].join(' ')}>
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

            <EventStatusSelector
                status={date.status}
                onChange={(status) => updateStatus(status)}
            />

            <ConcertStatusSwitch
                concertStatus={date.concertStatus}
                onChange={(status) => updateConcertStatus(status)}
            />

            <CopyButton onClick={() => copyDate()}/>

            <MoreDropdown
                label={<ImageButton src={settingsIcon}/>}
                dropdownActive={(isActive) =>
                    setActive(isActive)
                }
            >
                <NotesEditor
                    hideNotes={true}
                    buttonSize={"large"}
                    notes={date.notes}
                    onChange={(notes) => updateNotes(notes)}
                />

                <AdminNotesEditor
                    hideNotes={true}
                    buttonSize={"large"}
                    notes={date.adminNotes}
                    onChange={(adminNotes) => updateAdminNotes(adminNotes)}
                />

                <TimeGeneratorModalButton
                    date={date}
                    onSubmit={(dates) => addGeneratedDates(dates)}/>

            </MoreDropdown>

            <DeleteButton
                onClick={() => props.onDelete()}/>

            {date.notes && <>
                    <NotesEditor
                        hideNotes={false}
                        buttonSize={"line"}
                        notes={date.notes}
                        onChange={(notes) => updateNotes(notes)}/>
                </>
            }
            {date.adminNotes && <>
                    <AdminNotesEditor
                        hideNotes={false}
                        buttonSize={"line"}
                        notes={date.adminNotes}
                        onChange={(adminNotes) => updateAdminNotes(adminNotes)}/>
                </>
            }
        </div>
    );
}

export default DateListItem;
