import './date-list-item.scss';
import DateRangePicker from "../daterange-picker/daterange-picker";
import {useState, memo} from '@wordpress/element';
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

function DateListItem({index, date, addGeneratedDates, onEdit, highlighted = false}) {
    const [active, setActive] = useState(false);
    const userCanAdminNote = window?.createEventPermissions?.canSeeAdminNotes ?? false;

    const actions = useEventActions();
    // Every edit pins the row, so it stays in view when its new date sorts it
    // outside the visible window.
    const edit = (action) => (...args) => {
        onEdit?.(index);
        action(index, ...args);
    };
    const updateEventDate = edit(actions.updateEventDate);
    const updateEventLocation = edit(actions.updateEventLocation);
    const updateEventStatus = edit(actions.updateEventStatus);
    const updateEventConcertStatus = edit(actions.updateEventConcertStatus);
    const updateEventNotes = edit(actions.updateEventNotes);
    const updateEventAdminNotes = edit(actions.updateEventAdminNotes);

    const today = dayjs();

    return (
        <div
            className={[
                'date-list-item',
                dayjs(date.endDate).isAfter(today) ? 'future' : 'past',
                active ? 'active' : '',
                highlighted ? 'highlighted' : '',
            ].join(' ')}
            data-date-id={date.id ?? ''}
        >
            <DateRangePicker
                date={date}
                updateDate={({startDate, endDate}) =>
                    updateEventDate(startDate, endDate)
                }
                style="line"
            />

            <LocationPicker
                location={date.location}
                rooms={date.rooms}
                onChange={(rooms, location) =>
                    updateEventLocation(rooms, location)
                }
            />

            <EventStatusSelector
                status={date.status}
                onChange={(status) => updateEventStatus(status)}
            />

            <ConcertStatusSwitch
                concertStatus={date.concertStatus}
                onChange={(status) => updateEventConcertStatus(status)}
            />

            <CopyButton onClick={() => actions.duplicateEvent(index)}/>

            <MoreDropdown
                label={<ImageButton src={settingsIcon}/>}
                dropdownActive={(isActive) => setActive(isActive)}
            >
                <NotesEditor
                    hideNotes={true}
                    buttonSize="large"
                    notes={date.notes}
                    onChange={(notes) => updateEventNotes(notes)}
                />

                {userCanAdminNote && (
                    <AdminNotesEditor
                        hideNotes={true}
                        buttonSize="large"
                        adminNotes={date.adminNotes}
                        onChange={(adminNotes) => updateEventAdminNotes(adminNotes)}
                    />
                )}

                <TimeGeneratorModalButton
                    date={date}
                    onSubmit={(dates) => addGeneratedDates(dates)}
                />
            </MoreDropdown>

            <DeleteButton onClick={() => actions.deleteEvent(index)}/>

            {date.notes && (
                <NotesEditor
                    hideNotes={false}
                    buttonSize="line"
                    notes={date.notes}
                    onChange={(notes) => updateEventNotes(notes)}
                />
            )}

            {date.adminNotes && userCanAdminNote && (
                <AdminNotesEditor
                    hideNotes={false}
                    buttonSize="line"
                    adminNotes={date.adminNotes}
                    onChange={(adminNotes) => updateEventAdminNotes(adminNotes)}
                />
            )}
        </div>
    );
}

// Memoised: with many dates, an edit re-renders only the row it changed.
export default memo(DateListItem);
