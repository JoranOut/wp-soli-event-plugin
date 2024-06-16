import "./location-searcher.scss";
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

        let query;
        if (queryElem) {
            query = encodeURI(queryElem);
        }
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
                if (abortControllerRef.current.signal.aborted) {
                    setLoading(false)
                    setError(error)
                }
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
                    <p className="name">{location.name} <span>(selected)</span></p>
                    <p className="address">{location.address}</p>
                    <Button className="delete-button" title='delete' onClick={loc => clearLocation()}><img src={trashcan}/></Button>
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
                                onClick={() => onSelected(l)}>Selecteren</Button>
                        </div>
                    );
                })}
                {!isLoading && !locations && <div>Nothing found...</div>}
                {isLoading && <div>Loading...</div>}
            </div>

        </div>);
}

export default LocationSearcher;
