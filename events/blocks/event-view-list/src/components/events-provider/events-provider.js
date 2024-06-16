import "./events-provider.scss";
import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect} from '@wordpress/element';
import {fromEventDto} from "./event_mapper";

export default function EventsProvider(props) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [loadingBox, setLoadingBox] = useState();

    useEffect(() => {
        if (error === undefined && !isLoading && props.events == null) {
            setLoading(true)
            apiFetch({path: `soli_event/v1/events/all/${page}/${itemsPerPage}/`})
                .then(
                    (event) => {
                        setLoading(false)
                        setError(undefined)
                        props.setEvents(fromEventDto(event))
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
    }, [page])

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
                {!isLoading && !error && props.children}
                {isLoading && <p className="loadingtext" style={{...loadingBox}}>Loading page {page}...</p>}
            </>
        );
    }

}
