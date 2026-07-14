import './date-list-item.scss';
import DateRangePicker from "../daterange-picker/daterange-picker";
import {useState} from '@wordpress/element';
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
import {useEventActions} from "../events-context";

function DateListItem({index, date, addGeneratedDates, addDateCopy, onDelete}) {
    const [active, setActive] = useState(false);
    const userCanAdminNote = window?.createEventPermissions?.canSeeAdminNotes ?? false;

    const {
        updateEventDate,
        updateEventLocation,
        updateEventStatus,
        updateEventConcertStatus,
        updateEventNotes,
        updateEventAdminNotes,
    } = useEventActions();

    const today = dayjs();

    return (
        <div
            className={[
                'date-list-item',
                dayjs(date.endDate).isAfter(today) ? 'future' : 'past',
                active ? 'active' : '',
            ].join(' ')}
        >
            <DateRangePicker
                date={date}
                updateDate={({startDate, endDate}) =>
                    updateEventDate(index, startDate, endDate)
                }
                style="line"
            />

            <LocationPicker
                location={date.location}
                rooms={date.rooms}
                onChange={(rooms, location) =>
                    updateEventLocation(index, rooms, location)
                }
            />

            <EventStatusSelector
                status={date.status}
                onChange={(status) => updateEventStatus(index, status)}
            />

            <ConcertStatusSwitch
                concertStatus={date.concertStatus}
                onChange={(status) => updateEventConcertStatus(index, status)}
            />

            <CopyButton onClick={addDateCopy}/>

            <MoreDropdown
                label={<ImageButton src={settingsIcon}/>}
                dropdownActive={(isActive) => setActive(isActive)}
            >
                <NotesEditor
                    hideNotes={true}
                    buttonSize="large"
                    notes={date.notes}
                    onChange={(notes) => updateEventNotes(index, notes)}
                />

                {userCanAdminNote && (
                    <AdminNotesEditor
                        hideNotes={true}
                        buttonSize="large"
                        adminNotes={date.adminNotes}
                        onChange={(adminNotes) => updateEventAdminNotes(index, adminNotes)}
                    />
                )}

                <TimeGeneratorModalButton
                    date={date}
                    onSubmit={(dates) => addGeneratedDates(dates)}
                />
            </MoreDropdown>

            <DeleteButton onClick={onDelete}/>

            {date.notes && (
                <NotesEditor
                    hideNotes={false}
                    buttonSize="line"
                    notes={date.notes}
                    onChange={(notes) => updateEventNotes(index, notes)}
                />
            )}

            {date.adminNotes && userCanAdminNote && (
                <AdminNotesEditor
                    hideNotes={false}
                    buttonSize="line"
                    adminNotes={date.adminNotes}
                    onChange={(adminNotes) => updateEventAdminNotes(index, adminNotes)}
                />
            )}
        </div>
    );
}

export default DateListItem;
