import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect} from '@wordpress/element';

export default function LocationProvider({children, post_id, onLoading, onLocationsChanged, onLocationSaved}) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);

    // If there's an error in fetching the remote data, display the error.
    if (error) {
        return (
            <>
                <div>Error: {error.message}</div>
            </>
        );
        // If the data is still being loaded, show a loading message/icon/etc.
    } else if (isLoading) {
        return <div>Loading...</div>;
        // Data loaded successfully; so let's show it.
    } else {
        return (
            <>
                {children}
            </>
        );
    }

}
