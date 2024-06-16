import "./events-provider.scss";
import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect, useRef} from '@wordpress/element';
import {fromEventDto} from "./event_mapper";
import MonthNavigation from "../month-navigation/month-navigation";
import MonthDisplay from "../month-display/month-display";

export default function EventsProvider(props) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [yearmonth, setYearMonth] = useState(new Date().getFullYear() + "-" + (new Date().getMonth() + 1));
    const [loadingBox, setLoadingBox] = useState();
    const wrapperRef = useRef();

    const updateYearmonth = (newYearMonth) => {
        if (!isLoading) {
            props.setEvents(null);
            props.changeView(newYearMonth)
            setYearMonth(newYearMonth);
        }
    }

    useEffect(() => {
        if (wrapperRef && wrapperRef.current) {
            setLoadingBox({
                top: window.scrollY +
                    wrapperRef.current.getBoundingClientRect().top +
                    wrapperRef.current.getBoundingClientRect().height / 2 + "px"
            });
        }
        if (error === undefined && !isLoading && props.events == null) {
            setLoading(true)
            apiFetch({path: `soli_event/v1/events/${yearmonth}/`})
                .then(
                    (event) => {
                        setLoading(false)
                        setError(undefined)
                        props.setEvents(fromEventDto(event))
                        props.changeView(yearmonth)
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
    }, [yearmonth])

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
                <MonthDisplay
                    yearmonth={yearmonth}/>

                <div className={isLoading ? "calendar-wrapper loading" : "calendar-wrapper"}
                     ref={wrapperRef}>
                    <MonthNavigation
                        yearmonth={yearmonth}
                        setYearmonth={updateYearmonth}/>

                    {props.children}
                    <MonthNavigation
                        yearmonth={yearmonth}
                        setYearmonth={updateYearmonth}/>
                </div>
                {isLoading && <p className="loadingtext" style={{...loadingBox}}>Loading {yearmonth}...</p>}
            </>
        );
    }

}
