import "./internal-events-provider.scss";
import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect, useRef} from '@wordpress/element';
import {fromEventDto, splitEventsOnRooms} from "./event-mapper";

export default function InternalEventsProvider({setEvents, range, children}) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [loadingBox, setLoadingBox] = useState();
    const wrapperRef = useRef();

    const toDateString = (date) => {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .split("T")[0];
    }

    const filterEvent = (event) => {
        const rooms = JSON.parse(event.rooms);
        return rooms && rooms.length;
    }

    useEffect(() => {
        const abortController = new AbortController();

        if (!range) {
            return
        }

        if (wrapperRef && wrapperRef.current) {
            setLoadingBox({
                top: window.scrollY +
                    wrapperRef.current.getBoundingClientRect().top +
                    wrapperRef.current.getBoundingClientRect().height / 2 + "px"
            });
        }
        setLoading(true)

        const startDate = toDateString(range.start);
        const endDate = toDateString(range.end);

        apiFetch({
            path: `soli_event/v1/events/?start_date=${startDate}&end_date=${endDate}`,
            signal: abortController.signal
        })
            .then(
                (response) => {
                    setLoading(false)
                    setError(undefined)
                    const events = splitEventsOnRooms(response);
                    const filteredEvents = events.filter(filterEvent);
                    setEvents(fromEventDto(filteredEvents));
                },
                (error) => {
                    if (error.name === 'AbortError') {
                        return;
                    }
                    console.error(error)
                    setError(error)
                }
            ).finally(() => {
                setLoading(false)
            }
        );

        return () => abortController.abort();
    }, [range])

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
                <div className={isLoading ? "loading" : ""}
                     ref={wrapperRef}>

                    {children}
                </div>
                {isLoading && <p className="loadingtext" style={{...loadingBox}}>Loading events...</p>}
            </>
        );
    }

}
