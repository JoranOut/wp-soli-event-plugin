import "./events-provider.scss";
import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect, useRef} from '@wordpress/element';
import {fromEventDto} from "./event_mapper";
import MonthNavigation from "../month-navigation/month-navigation";
import MonthDisplay from "../month-display/month-display";

export default function EventsProvider({setEvents, range, children}) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [loadingBox, setLoadingBox] = useState();
    const wrapperRef = useRef();

    const toDateString = (date)=>{
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000 ))
            .toISOString()
            .split("T")[0];
    }

    useEffect(() => {
        if (wrapperRef && wrapperRef.current) {
            setLoadingBox({
                top: window.scrollY +
                    wrapperRef.current.getBoundingClientRect().top +
                    wrapperRef.current.getBoundingClientRect().height / 2 + "px"
            });
        }
        if (error === undefined && !isLoading && range) {
            setLoading(true)
            const startDate = toDateString(range.start);
            const endDate = toDateString(range.end);

            apiFetch({path: `soli_event/v1/events/?start_date=${startDate}&end_date=${endDate}`})
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
                <div className={isLoading ? "calendar-wrapper loading" : "calendar-wrapper"}
                     ref={wrapperRef}>

                    {children}
                </div>
                {isLoading && <p className="loadingtext" style={{...loadingBox}}>Loading events...</p>}
            </>
        );
    }

}
