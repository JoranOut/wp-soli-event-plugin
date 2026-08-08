import "./events-provider.scss";
import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {fromEventDto} from './event_mapper';

export default function EventsProvider({children, setEvents, eventsPerPage, currentPage, setTotalPages}) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [loadingBox, setLoadingBox] = useState();
    const loadPerPage = eventsPerPage ?? 10;

    useEffect(() => {
        // Refetch whenever page/size changes. Clearing error on each run means a
        // transient failure no longer permanently blocks the block, and the
        // cancelled flag drops stale responses when inputs change mid-flight.
        let cancelled = false;
        setLoading(true)
        setError(undefined)
        apiFetch({path: `soli_event/v1/events/future/${currentPage}/${loadPerPage}/`})
            .then(
                (response) => {
                    if (cancelled) return;
                    setLoading(false)
                    // A 204 (no future events) resolves to null; guard against it.
                    setEvents(fromEventDto(response?.events))
                    setTotalPages(response?.totalPages ?? 0)
                },
                // Note: It's important to handle errors here instead of a catch() block
                // so that we don't swallow exceptions from actual bugs in components.
                (error) => {
                    if (cancelled) return;
                    console.error(error)
                    setLoading(false)
                    setError(error)
                }
            );
        return () => { cancelled = true; };
    }, [currentPage, loadPerPage])

    // If there's an error in fetching the remote data, display the error.
    if (error) {
        return (
            <>
                <div>{sprintf(__('Error: %s', 'soli-event'), error.message)}</div>
            </>
        );
        // If the data is still being loaded, show a loading message/icon/etc.
    } else {
        return (
            <>
                {!isLoading && !error && children}
                {isLoading && <p className="loadingtext" style={{...loadingBox}}>{sprintf(__('Loading page %s…', 'soli-event'), currentPage)}</p>}
            </>
        );
    }

}
