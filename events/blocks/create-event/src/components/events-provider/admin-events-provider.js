import apiFetch from '@wordpress/api-fetch';
import { useSelect, useDispatch } from '@wordpress/data';
import {useState, useEffect} from '@wordpress/element';
import {fromEventDto, toEventDto} from "./event-mapper";

export default function AdminEventsProvider(props) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [initialData, setInitialData] = useState(null);
    const { isSavingPost, isNewPost } = useSelect((select) => ({
        isSavingPost: select('core/editor').isSavingPost(),
        isNewPost: !select('core/editor').getCurrentPostId(),
    }));
    const { editPost } = useDispatch('core/editor');

    useEffect(() => {
        if (error === undefined && !isLoading && props.dates == null) {
            setLoading(true)
            apiFetch({path: 'soli_event/v1/events/' + props.post_id})
                .then(
                    (event) => {
                        const eventData = fromEventDto(event);
                        props.setDates(eventData);
                        setInitialData(eventData);
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
    });

    useEffect(() => {
        if (initialData && props.dates && JSON.stringify(initialData) !== JSON.stringify(props.dates)) {
            editPost({ meta: { hasNewEventData: true } });
            if (isNewPost) {
                editPost({ status: 'draft' });
            }
        }
    }, [props.dates]);

    const hasInvalidForms = () => {
        return document.querySelector(`.soli-block-create-event:has(.invalid)`);
    }

    const postAPI = () => {
        if (hasInvalidForms()){
            console.log("the form has invalid inputs")
            return;
        }

        apiFetch({
            path: 'soli_event/v1/events/' + props.post_id,
            method: 'POST',
            data: toEventDto(props.dates)
        }).then(
            (event) => {
                props.setDates(fromEventDto(event))
                setLoading(false)
                editPost({ meta: { hasNewEventData: false } });
            },
            // Note: It's important to handle errors here instead of a catch() block
            // so that we don't swallow exceptions from actual bugs in components.
            (error) => {
                setLoading(false)
                setError(error)
            }
        );
    }

    useEffect(() => {
        if (isSavingPost) {
            postAPI();
        }
    }, [isSavingPost]);

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
            </>
        );
    }
}
