import "./event-detail-pop-up.scss";
import {useState, useEffect, useRef} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import dayjs from "dayjs";
import "dayjs/locale/nl";

export default function EventDetailPopUp(props) {
    const [box, setBox] = useState({});
    const [side, setSide] = useState("right");
    const ref = useRef();

    const isSingleDay = (d1, d2) => {
        return d1.date() === d2.date() &&
            d1.month() === d2.month() &&
            d1.year() === d2.year();
    }

    const parseDate = (start, end) => {
        if (isSingleDay(start, end)){
            return start.locale("nl").format("dddd D MMMM YYYY, HH:mm") + " - " + end.format("HH:mm")
        }
        return start.locale("nl").format("dddd D MMMM YYYY, HH:mm") + " - " + end.locale("nl").format("dddd D MMMM YYYY, HH:mm");
    }

    useOutsideClick(ref, (e) => {
        // Clicking another calendar event should switch the popup, not close it;
        // any other click outside the popup dismisses it on the first try.
        if (e.target.closest && e.target.closest('.fc-event')) {
            return;
        }
        props.clearEvent();
    });

    const boxybox = (eventBox) => {
        // eventBox is a DOMRect from getBoundingClientRect(). Absolute
        // positioning resolves against the nearest positioned ancestor -
        // theme layout wrappers are often positioned - so express the
        // coordinates relative to the popup's offsetParent: both rects are
        // viewport-relative, so their difference needs no scroll offsets.
        if (!eventBox || !ref.current) {
            return;
        }
        const popupHeight = ref.current.offsetHeight;
        const popupWidth = ref.current.offsetWidth;
        const parent = ref.current.offsetParent || document.body;
        const parentRect = parent.getBoundingClientRect();
        // Vertically center the popup on the event pill.
        const relTop = eventBox.top - parentRect.top + eventBox.height / 2 - popupHeight / 2;
        const relLeft = eventBox.left - parentRect.left;

        // popup width (260) + gap + a little slack
        if (eventBox.left + eventBox.width + 315 > window.innerWidth) {
            setSide("left")
            setBox({
                top: relTop + 'px',
                left: relLeft - popupWidth - 10 + 'px',
            });
        } else {
            setSide("right")
            setBox({
                top: relTop + 'px',
                left: relLeft + eventBox.width + 10 + 'px',
            });
        }
    }

    useEffect(() => {
        boxybox(props.boundingBox);
    }, [props]);

    return (
        <>
            {props.event &&
                <div ref={ref} role="dialog" aria-label={props.event.title}
                     className={["event-detail-popup", side].join(" ")} style={box}>
                    {props.event.extendedProps?.featuredImage &&
                        <img src={props.event.extendedProps.featuredImage} alt={props.event.title}/>}
                    <div className="popup-body">
                        <p className="popup-kicker">
                            {props.event.extendedProps?.isConcert ? __('Concert', 'soli-event') : __('Activity', 'soli-event')}
                        </p>
                        <h2>{props.event.title}</h2>
                        <p className="popup-date">
                            {parseDate(dayjs(props.event.start), dayjs(props.event.end))}
                        </p>
                        {(() => {
                            const {locationName, rooms} = props.event.extendedProps || {};
                            const location = locationName
                                || (rooms && rooms.length ? rooms.join(', ') : null);
                            return location
                                ? <p className="popup-location">{location}</p>
                                : null;
                        })()}
                        <a className="popup-link" href={props.event.url}>{__('View event →', 'soli-event')}</a>
                    </div>
                </div>
            }
        </>
    );
}

const useOutsideClick = (ref, callback) => {
    const handleClick = e => {
        if (ref.current && !ref.current.contains(e.target)) {
            callback(e);
        }
    };

    useEffect(() => {
        document.addEventListener("click", handleClick);

        return () => {
            document.removeEventListener("click", handleClick);
        };
    });
};
