import "./location-searcher.scss";
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect, useRef} from '@wordpress/element';
import {Button, SearchControl} from "@wordpress/components"
import {addQueryArgs} from '@wordpress/url';
import trashcan from "../../../../../../inc/assets/img/icons/delete.svg";

function LocationSearcher({location, onSelected}) {
    const [locations, setLocations] = useState([]);
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const abortControllerRef = useRef(null);

    const onLocationsChanged = (locations) => {
        setLocations(locations);
    };

    const clearLocation = () => {
        onSelected(null)
    };

    const searchLocations = (queryElem) => {
        setSearchInput(queryElem);

        if (abortControllerRef?.current) {
            abortControllerRef.current.abort("cancel previous request");
        }

        const newAbortController = new AbortController();

        abortControllerRef.current = newAbortController;

        // addQueryArgs already URL-encodes values; encodeURI here would
        // double-encode the search term.
        const query = queryElem ? queryElem : undefined;
        setLoading(true);

        apiFetch({
            path: addQueryArgs('soli_event/v1/location/search', {query: query, limit: 5}),
            signal: newAbortController?.signal
        }).then(
            (location) => {
                onLocationsChanged(location)
                setLoading(false)
                setError(null)
            },
            // Note: It's important to handle errors here instead of a catch() block
            // so that we don't swallow exceptions from actual bugs in components.
            (error) => {
                // A superseded request rejects with an abort; that is expected,
                // so ignore it. Any other rejection is a real error to surface.
                if (newAbortController.signal.aborted) {
                    return;
                }
                setLoading(false)
                setError(error)
            },
        );
    }

    useEffect(() => {
        searchLocations();
    }, []);

    return (
        <div className="location-searcher">
            <div className="location-search-result">
                {location && <div className="location selected" key={0}>
                    <p className="name">{location.name} <span>{__('(selected)', 'soli-event')}</span></p>
                    <p className="address">{location.address}</p>
                    <Button className="delete-button" title={__('delete', 'soli-event')} onClick={loc => clearLocation()}><img src={trashcan}/></Button>
                </div>}
                <SearchControl value={searchInput} onChange={(value) => searchLocations(value)}/>
                {!isLoading && locations && locations.filter(l => l.name !== location?.name).map((l, index) => {
                    return (
                        <div className="location" key={index + 1}>
                            <p className="name">{l.name}</p>
                            <p className="address">{l.address}</p>
                            <Button
                                className="submit-button"
                                variant="secondary"
                                onClick={() => onSelected(l)}>{__('Select', 'soli-event')}</Button>
                        </div>
                    );
                })}
                {!isLoading && !locations && <div>{__('Nothing found…', 'soli-event')}</div>}
                {isLoading && <div>{__('Loading…', 'soli-event')}</div>}
            </div>

        </div>);
}

export default LocationSearcher;
