import "./events-provider.scss";
import apiFetch from '@wordpress/api-fetch';
import {useState, useEffect, useRef} from '@wordpress/element';
import {fromEventDto} from "./event-mapper";
import {ROOM_COLORS} from "../../../../../inc/values";

export default function EventsProvider({setEvents, range, filters, children}) {
    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [loadingBox, setLoadingBox] = useState();
    const wrapperRef = useRef();

    const [cache, setCache] = useState([]);
    const splitEvents = (f) => f.includes("only-internal");

    const toDateString = (date) => {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .split("T")[0];
    }

    const splitEventsOnRooms = (events) => {
        if (!events) {
            return [];
        }
        return events.flatMap(event => {
            if (!event.rooms) {
                return event;
            }
            const rooms = JSON.parse(event.rooms);
            if (!rooms || rooms.length === 0) {
                return event;
            }
            return rooms.map((room, index) => {
                return {
                    ...event,
                    id: `${event.id}.${index}`,
                    post_title: `${event.post_title} - ${room}`,
                    rooms: JSON.stringify([room]),
                    color: ROOM_COLORS[room]
                }
            })
        })
    }

    const filterEvent = (event, filters) => {
        const concert = !filters.includes("only-concerts") || event.is_concert;

        let room = true;
        const rooms = JSON.parse(event.rooms);
        const internal = !filters.includes("only-internal") || !!rooms;
        const roomFilters = filters.filter(f => f !== "only-concerts" || f !== "only-internal");
        if (filters.includes("only-internal") && roomFilters.length > 0) {
            if (!rooms || !rooms.some(r => roomFilters.includes(r))) {
                room = false;
            }
        }

        return concert && internal && room;
    }

    useEffect(() => {
        const events = splitEvents(filters) ? splitEventsOnRooms(cache) : cache;
        const filteredEvents = events.filter(event => filterEvent(event, filters));
        setEvents(fromEventDto(filteredEvents));
    }, [filters]);

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
                    (response) => {
                        setLoading(false)
                        setError(undefined)
                        setCache(response);
                        const events = splitEvents(filters) ? splitEventsOnRooms(response) : response;
                        const filteredEvents = events.filter(event => filterEvent(event, filters));
                        setEvents(fromEventDto(filteredEvents));
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
