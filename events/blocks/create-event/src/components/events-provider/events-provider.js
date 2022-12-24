import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect} from '@wordpress/element';
import {Button} from "@wordpress/components"
import {fromEventDto, toEventDto} from "./event_mapper";

export default function EventsProvider(props) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);

    useEffect(() => {
        if (error === undefined && !isLoading && props.dates == null) {
            setLoading(true)
            apiFetch({path: 'soli_event/events/' + props.post_id})
                .then(
                    (event) => {
                        console.log(fromEventDto(event))
                        props.setDates(fromEventDto(event))
                        setLoading(false)
                        setError(null)
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
    })

    const postAPI = () => {
        apiFetch({
            path: 'soli_event/events/' + props.post_id,
            method: 'POST',
            data: toEventDto(props.dates)
        }).then(
            (event) => {
                props.setDates(fromEventDto(event))
                console.log(fromEventDto(event))
                setLoading(false)
            },
            // Note: It's important to handle errors here instead of a catch() block
            // so that we don't swallow exceptions from actual bugs in components.
            (error) => {
                setLoading(false)
                setError(error)
            }
        );
    }

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
                {props.children}
                <Button onClick={() => postAPI()}>Save</Button>
            </>
        );
    }

}
