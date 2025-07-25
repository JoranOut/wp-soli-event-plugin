import "./events-provider.scss";
import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect} from '@wordpress/element';
import {fromEventDto} from './event_mapper';

export default function EventsProvider({children, setEvents, eventsPerPage}) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [loadingBox, setLoadingBox] = useState();
    const loadPerPage = eventsPerPage ?? 10;

    useEffect(() => {
        if (error === undefined && !isLoading) {
            setLoading(true)
            apiFetch({path: `soli_event/v1/events/future/${page}/${loadPerPage}/`})
                .then(
                    (event) => {
                        setLoading(false)
                        setError(undefined)
                        setEvents(fromEventDto(event))
                    },
                    // Note: It's important to handle errors here instead of a catch() block
                    // so that we don't swallow exceptions from actual bugs in components.
                    (error) => {
                        console.error(error)
                        setLoading(false)
                        setError(error)
                    }
                );
        }
    }, [page, loadPerPage])

    // If there's an error in fetching the remote data, display the error.
    if (error) {
        return (
            <>
                <div>Error: {error.message}</div>
            </>
        );
        // If the data is still being loaded, show a loading message/icon/etc.
    } else {
        return (
            <>
                {!isLoading && !error && children}
                {isLoading && <p className="loadingtext" style={{...loadingBox}}>Loading page {page}...</p>}
            </>
        );
    }

}
