import "./index.scss"
import { __ } from '@wordpress/i18n';
import EditableDateTable from "./components/editable-date-table/editable-date-table";
import AdminEventsProvider from "./components/events-provider/admin-events-provider";
import DateRangePicker from "./components/daterange-picker/daterange-picker";
import LocationPicker from "./components/location-picker/location-picker";
import TimeGeneratorModalButton from "./components/time-generator-modal-button/time-generator-modal-button";
import CopyButton from "./components/copy-button/copy-button";
import EventStatusSelector from "./components/event-status-selector/event-status-selector";
import NotesEditor from "./components/notes-editor/notes-editor";
import ConcertStatusSwitch from "./components/concert-status-switch/concert-status-switch";
import AdminNotesEditor from "./components/admin-notes-editor/admin-notes-editor";
import {useEventState, useEventActions} from "./components/events-context";

wp.blocks.registerBlockType("soli/create-event", {
    title: __("Create Event", "soli-event"),
    icon: "smiley",
    category: "soli",
    supports: {
        align: ["wide"]
    },
    edit: EditComponent,
    save: function () {
        return null
    },
    usesContext: ['postId']
})

function SingleEventEditor({userCanAdminNote}) {
    const {events} = useEventState();
    const {
        updateEventDate,
        updateEventLocation,
        updateEventStatus,
        updateEventConcertStatus,
        updateEventNotes,
        updateEventAdminNotes,
        addGeneratedEvents,
        duplicateEvent
    } = useEventActions();

    const single = events[0] || {};

    return (
        <div className="single-event">
            <DateRangePicker
                date={single}
                minimalDate={new Date()}
                updateDate={({id, startDate, endDate}) =>
                    updateEventDate(0, startDate, endDate)
                }
                defaultDate={true}
            />

            <LocationPicker
                location={single.location}
                rooms={single.rooms}
                onChange={(rooms, location) =>
                    updateEventLocation(0, rooms, location)
                }
            />

            <ConcertStatusSwitch
                concertStatus={single.concertStatus}
                onChange={(status) => updateEventConcertStatus(0, status)}
            />

            <NotesEditor
                hideNotes={!single?.notes}
                buttonSize="small"
                notes={single.notes}
                onChange={(notes) => updateEventNotes(0, notes)}
            />

            {userCanAdminNote && (
                <AdminNotesEditor
                    hideNotes={!single?.adminNotes}
                    buttonSize="small"
                    adminNotes={single.adminNotes}
                    onChange={(adminNotes) => updateEventAdminNotes(0, adminNotes)}
                />
            )}

            <TimeGeneratorModalButton
                buttonSize="small"
                date={single}
                onSubmit={(genDates) => addGeneratedEvents(genDates)}
            />

            <CopyButton onClick={() => duplicateEvent(0)}/>

            <EventStatusSelector
                status={single.status}
                onChange={(status) => updateEventStatus(0, status)}
            />
        </div>
    );
}

function MultiEventEditor() {
    return <EditableDateTable/>;
}

function InnerEdit({userCanAdminNote}) {
    const {events} = useEventState();
    const hasMultiple = events.length > 1;

    return (
        <>
            {!hasMultiple && <SingleEventEditor userCanAdminNote={userCanAdminNote}/>}
            {hasMultiple && <MultiEventEditor/>}
        </>
    );
}

function EditComponent({context}) {
    const {postId} = context;
    const userCanAdminNote = window?.createEventPermissions?.canSeeAdminNotes ?? false;

    return (
        <div className="soli-block-create-event">
            <AdminEventsProvider post_id={postId}>
                <InnerEdit userCanAdminNote={userCanAdminNote}/>
            </AdminEventsProvider>
        </div>
    );
}
