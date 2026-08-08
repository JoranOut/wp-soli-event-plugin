import { __, sprintf } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import {useSelect, useDispatch, select as dataSelect} from '@wordpress/data';
import {useState, useEffect, useCallback, useRef} from '@wordpress/element';
import {fromEventDto, toEventDto} from "./event-mapper";
import {EventsProvider, useEventState, useEventActions} from "../events-context";
import {toHash} from "../events-context/events-hash";
import FirstEventWizard from "../first-event-wizard/first-event-wizard";
import {EVENT_STATUS} from "../../../../../inc/values";

const DATES_META_KEY = 'soli_event_dates';
const INVALID_SAVE_LOCK = 'soli-event-invalid-dates';

function AdminSaveBridge({postId, persistedHash, onPersisted}) {
    const {events, currentHash, isInitialized} = useEventState();
    const {rebaseEvents} = useEventActions();
    const {isSavingPost, isAutosaving} = useSelect((select) => {
        const editor = select('core/editor');
        return {
            isSavingPost: editor.isSavingPost(),
            isAutosaving: editor.isAutosavingPost(),
        };
    }, []);
    const {editPost, lockPostSaving, unlockPostSaving} = useDispatch('core/editor');
    const {createErrorNotice} = useDispatch('core/notices');

    // Mirror the pending event data into the transport meta whenever the
    // editor state differs from what the event_dates table holds (the
    // persisted hash - not the context's dirty flag, which is false for the
    // fabricated default date of a brand-new event). The meta travels inside
    // the regular post save request; the server moves it into the table and
    // clears it again. While it holds a payload, Gutenberg's own dirty
    // tracking provides the Update button and the leave-tab warning; once it
    // returns to '' (the persisted value) the post is clean again.
    const hasPendingChanges = currentHash !== persistedHash;
    useEffect(() => {
        if (!isInitialized) return;
        editPost({
            meta: {
                [DATES_META_KEY]: hasPendingChanges
                    ? JSON.stringify(toEventDto(events))
                    : '',
            },
        });
    }, [events, hasPendingChanges, isInitialized, editPost]);

    // Block saving while a date field shows an invalid value. The invalid
    // flag is component-local state that never reaches the events context, so
    // watch the DOM class MUI toggles instead.
    useEffect(() => {
        const sync = () => {
            if (document.querySelector('.soli-block-create-event:has(.invalid)')) {
                lockPostSaving(INVALID_SAVE_LOCK);
            } else {
                unlockPostSaving(INVALID_SAVE_LOCK);
            }
        };
        const observer = new MutationObserver(sync);
        observer.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });
        sync();
        return () => {
            observer.disconnect();
            unlockPostSaving(INVALID_SAVE_LOCK);
        };
    }, [lockPostSaving, unlockPostSaving]);

    // After a successful (non-auto) save that carried event data, the server
    // has rewritten the date rows. Fetch them back and rebase the context so
    // the fresh row ids become the new baseline: Reset compares against what
    // is stored, and re-saving does not delete/re-insert the same dates.
    const wasSavingRef = useRef(false);
    const hadPendingRef = useRef(false);
    const hasPendingRef = useRef(hasPendingChanges);
    hasPendingRef.current = hasPendingChanges;

    useEffect(() => {
        const saving = isSavingPost && !isAutosaving;
        const wasSaving = wasSavingRef.current;
        wasSavingRef.current = saving;

        if (saving && !wasSaving) {
            hadPendingRef.current = hasPendingRef.current;
            return;
        }
        if (saving || !wasSaving || !hadPendingRef.current) return;
        hadPendingRef.current = false;
        // On a failed save the meta edit is still pending, so the next
        // successful save picks the payload up again - nothing to redo here.
        if (!dataSelect('core/editor').didPostSaveRequestSucceed()) return;

        apiFetch({path: 'soli_event/v1/events/' + postId}).then(
            (event) => {
                const eventData = fromEventDto(event) || [];
                onPersisted(toHash(eventData));
                rebaseEvents(eventData);
            },
            (error) => {
                createErrorNotice(
                    __('Event data was saved, but could not be reloaded. Reload the page.', 'soli-event'),
                    {type: 'snackbar'}
                );
                console.error('Failed to reload events after save:', error);
            }
        );
    }, [isSavingPost, isAutosaving, postId, onPersisted, rebaseEvents, createErrorNotice]);

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
    // Hash of the rows as they exist in the event_dates table. For a new post
    // this is the hash of an empty set, so the fabricated default date counts
    // as a pending change and is persisted on the first save.
    const [persistedHash, setPersistedHash] = useState(null);
    // Latched open once when a brand-new post has no dates yet; closing it
    // (skip/esc/finish) is final for this editing session.
    const [showWizard, setShowWizard] = useState(false);
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
                    setPersistedHash(toHash(eventData || []));
                    if (!eventData || eventData.length === 0) {
                        // Guide first-time setup on a brand-new post (an
                        // auto-draft). An existing event whose dates were all
                        // deleted keeps the plain inline editor.
                        if (dataSelect('core/editor').isEditedPostNew()) {
                            setShowWizard(true);
                        }
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
        // A brand-new post has no status yet; make sure event edits alone are
        // enough to let it be saved as a draft.
        if (isDirty && isNewPost) {
            editPost({status: 'draft'});
        }
    }, [editPost, isNewPost]);

    if (error) {
        return <div>{sprintf(__('Error: %s', 'soli-event'), error.message)}</div>;
    }
    if (isLoading || !initialEvents) {
        return <div>{__('Loading…', 'soli-event')}</div>;
    }

    return (
        <EventsProvider
            mode="admin"
            readOnly={false}
            initialEvents={initialEvents}
            onDirtyChange={handleDirtyChange}
        >
            <AdminSaveBridge
                postId={post_id}
                persistedHash={persistedHash}
                onPersisted={setPersistedHash}
            />
            {showWizard && <FirstEventWizard onClose={() => setShowWizard(false)}/>}
            {children}
        </EventsProvider>
    );
}
