import apiFetch from '@wordpress/api-fetch';
import {useSelect, useDispatch} from '@wordpress/data';
import {useState, useEffect, useCallback, useRef} from '@wordpress/element';
import {fromEventDto, toEventDto} from "./event-mapper";
import {EventsProvider, useEventState, useEventActions} from "../events-context";
import {EVENT_STATUS} from "../../../../../inc/values";

function AdminSaveBridge({postId}) {
    const {events} = useEventState();
    const {rebaseEvents} = useEventActions();
    const {isSavingPost, isAutosaving, isSavingEntities} = useSelect((select) => {
        const editor = select('core/editor');
        return {
            isSavingPost: editor.isSavingPost(),
            isAutosaving: editor.isAutosavingPost(),
            isSavingEntities: editor.isSavingNonPostEntityChanges
                ? editor.isSavingNonPostEntityChanges()
                : false,
        };
    }, []);
    const {editPost} = useDispatch('core/editor');
    const {createErrorNotice} = useDispatch('core/notices');

    // Keep the latest events reachable without making them a trigger for the
    // save effect — otherwise editing during a save would fire a second POST.
    const eventsRef = useRef(events);
    eventsRef.current = events;
    const inFlightRef = useRef(false);

    useEffect(() => {
        // Only react to a real, user-initiated post save. Autosaves and
        // entity-only saves must never persist event dates: the server prunes
        // any date row not in the payload, so an autosave of half-edited state
        // would delete data the user never chose to save.
        if (!isSavingPost || isAutosaving || isSavingEntities) return;
        if (inFlightRef.current) return;

        const hasInvalidForms = () =>
            document.querySelector(`.soli-block-create-event:has(.invalid)`);

        if (hasInvalidForms()) {
            createErrorNotice(
                'Evenement-data kon niet worden opgeslagen: er zijn ongeldige velden.',
                {type: 'snackbar'}
            );
            return;
        }

        inFlightRef.current = true;
        apiFetch({
            path: 'soli_event/v1/events/' + postId,
            method: 'POST',
            data: toEventDto(eventsRef.current),
        }).then(
            (event) => {
                const eventData = fromEventDto(event);
                editPost({meta: {hasNewEventData: false}});
                // Rebase the context onto the persisted rows (which carry fresh
                // ids) so the dirty baseline and Reset match what is stored,
                // and so re-saving does not delete/re-insert the same dates.
                if (eventData && eventData.length > 0) {
                    rebaseEvents(eventData);
                }
            },
            (error) => {
                createErrorNotice(
                    'Opslaan van de evenement-data is mislukt. Probeer opnieuw.',
                    {type: 'snackbar'}
                );
                console.error('Failed to save events:', error);
            }
        ).finally(() => {
            inFlightRef.current = false;
        });
    }, [isSavingPost, isAutosaving, isSavingEntities, postId, editPost, createErrorNotice, rebaseEvents]);

    return null;
}

function getDefaultDate(h) {
    const date = new Date();
    if (h) {
        date.setTime(date.getTime() + (h * 60 * 60 * 1000));
        // Keep a new event's default end on the same calendar day as its start;
        // near midnight, start + 1h would otherwise spill into the next day and
        // default a brand-new event to spanning midnight.
        const start = new Date();
        if (date.getFullYear() !== start.getFullYear()
            || date.getMonth() !== start.getMonth()
            || date.getDate() !== start.getDate()) {
            date.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
            date.setHours(23, 59, 0, 0);
        }
    }
    return date.toISOString();
}

export default function AdminEventsProvider({post_id, children}) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [initialEvents, setInitialEvents] = useState(null);
    const {editPost} = useDispatch('core/editor');
    const {isNewPost} = useSelect((select) => ({
        isNewPost: !select('core/editor').getCurrentPostId(),
    }));

    useEffect(() => {
        if (error === undefined && !isLoading && initialEvents == null) {
            setLoading(true);
            apiFetch({path: 'soli_event/v1/events/' + post_id}).then(
                (event) => {
                    let eventData = fromEventDto(event);
                    if (!eventData || eventData.length === 0) {
                        eventData = [{
                            startDate: getDefaultDate(),
                            endDate: getDefaultDate(1),
                            // Persist the selector's default so a new event saves
                            // with a status and it shows in the admin table.
                            status: EVENT_STATUS[0]
                        }];
                    }
                    setInitialEvents(eventData);
                    setLoading(false);
                    setError(null);
                },
                (err) => {
                    console.error(err);
                    setLoading(false);
                    setError(err);
                }
            );
        }
    }, [post_id, error, isLoading, initialEvents]);

    const handleDirtyChange = useCallback((isDirty) => {
        // Mirror the dirty flag both ways so undoing back to a clean state also
        // clears hasNewEventData; a stable identity keeps this out of the
        // provider's notify effect deps.
        editPost({meta: {hasNewEventData: isDirty}});
        if (isDirty && isNewPost) {
            editPost({status: 'draft'});
        }
    }, [editPost, isNewPost]);

    if (error) {
        return <div>Error: {error.message}</div>;
    }
    if (isLoading || !initialEvents) {
        return <div>Loading...</div>;
    }

    return (
        <EventsProvider
            mode="admin"
            readOnly={false}
            initialEvents={initialEvents}
            onDirtyChange={handleDirtyChange}
        >
            <AdminSaveBridge postId={post_id}/>
            {children}
        </EventsProvider>
    );
}
