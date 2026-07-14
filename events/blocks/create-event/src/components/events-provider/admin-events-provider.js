import apiFetch from '@wordpress/api-fetch';
import {useSelect, useDispatch} from '@wordpress/data';
import {useState, useEffect} from '@wordpress/element';
import {fromEventDto, toEventDto} from "./event-mapper";
import {EventsProvider, useEventState} from "../events-context";

function AdminSaveBridge({postId, onSaveComplete}) {
    const {events} = useEventState();
    const {isSavingPost} = useSelect((select) => ({
        isSavingPost: select('core/editor').isSavingPost(),
    }));
    const {editPost} = useDispatch('core/editor');

    useEffect(() => {
        if (!isSavingPost) return;

        const hasInvalidForms = () =>
            document.querySelector(`.soli-block-create-event:has(.invalid)`);

        if (hasInvalidForms()) {
            console.log('the form has invalid inputs');
            return;
        }

        apiFetch({
            path: 'soli_event/v1/events/' + postId,
            method: 'POST',
            data: toEventDto(events),
        }).then(
            (event) => {
                const eventData = fromEventDto(event);
                editPost({meta: {hasNewEventData: false}});
                if (onSaveComplete) {
                    onSaveComplete(eventData);
                }
            },
            (error) => {
                console.error('Failed to save events:', error);
            }
        );
    }, [isSavingPost, events, postId, editPost, onSaveComplete]);

    return null;
}

function getDefaultDate(h) {
    const date = new Date();
    if (h) {
        date.setTime(date.getTime() + (h * 60 * 60 * 1000));
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
                            endDate: getDefaultDate(1)
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

    const handleDirtyChange = (isDirty) => {
        if (isDirty) {
            editPost({meta: {hasNewEventData: true}});
            if (isNewPost) {
                editPost({status: 'draft'});
            }
        }
    };

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
