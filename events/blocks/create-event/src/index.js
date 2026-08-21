import "./index.scss"
import { __ } from '@wordpress/i18n';
import { useRef, useState, useEffect } from '@wordpress/element';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
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
import InvoiceButton from "./components/invoice-button/invoice-button";
import {useEventState, useEventActions} from "./components/events-context";

/**
 * Emotion cache scoped to the document that owns the block's canvas DOM node.
 * In WordPress 7.1+ the editor renders inside an iframe, so the canvas
 * document differs from the outer wp-admin document.  Without this wrapper
 * Emotion's default insertion point (the outer document's <head>) is invisible
 * to the iframe, and all MUI runtime styles are lost.
 *
 * The anchor <span> must live inside the block's canvas subtree so that
 * element.ownerDocument resolves to the iframe document, not the outer one.
 * Do not anchor from InspectorControls — those render in the sidebar (outer
 * document) and would defeat the purpose.
 */
function IframeAwareMuiProvider( { children } ) {
    const anchorRef = useRef( null );
    const [ cache, setCache ] = useState( null );

    useEffect( () => {
        const node = anchorRef.current;
        if ( ! node ) return;
        const ownerDoc = node.ownerDocument;
        setCache(
            createCache( {
                key: 'soli-ce',
                container: ownerDoc.head,
            } )
        );
    }, [] );

    return (
        <>
            <span ref={ anchorRef } style={ { display: 'none' } } />
            { cache && (
                <CacheProvider value={ cache }>{ children }</CacheProvider>
            ) }
        </>
    );
}

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
            {events.length > 0 && <InvoiceButton/>}
        </>
    );
}

function EditComponent({context}) {
    const {postId} = context;
    const userCanAdminNote = window?.createEventPermissions?.canSeeAdminNotes ?? false;

    return (
        <div className="soli-block-create-event">
            <IframeAwareMuiProvider>
                <AdminEventsProvider post_id={postId}>
                    <InnerEdit userCanAdminNote={userCanAdminNote}/>
                </AdminEventsProvider>
            </IframeAwareMuiProvider>
        </div>
    );
}
