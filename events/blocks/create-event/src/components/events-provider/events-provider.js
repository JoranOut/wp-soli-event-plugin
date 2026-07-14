import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect} from '@wordpress/element';
import {fromEventDto} from "./event-mapper";
import {EventsProvider} from "../events-context";

export default function FrontendEventsProvider({post_id, children}) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [initialEvents, setInitialEvents] = useState(null);

    useEffect(() => {
        if (error === undefined && !isLoading && initialEvents == null) {
            setLoading(true);
            apiFetch({path: 'soli_event/v1/events/' + post_id}).then(
                (event) => {
                    const eventData = fromEventDto(event);
                    setInitialEvents(eventData || []);
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

    if (error) {
        return <div>Error: {error.message}</div>;
    }
    if (isLoading || !initialEvents) {
        return <div>Loading...</div>;
    }

    return (
        <EventsProvider
            mode="frontend"
            readOnly={true}
            initialEvents={initialEvents}
        >
            {children}
        </EventsProvider>
    );
}
