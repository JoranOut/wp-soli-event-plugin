import "./event-detail-pop-up.scss";
import {useState, useEffect, useRef} from '@wordpress/element';
import dayjs from "dayjs";

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
            return start.format("dddd D MMMM, YYYY HH:mm") + " - " + end.format("HH:mm")
        }
        return start.format("dddd D MMMM, YYYY HH:mm") + " + " + end.format("dddd D MMMM, YYYY HH:mm");
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
        // eventBox is a DOMRect from getBoundingClientRect(): its coordinates are
        // viewport-relative and it has no offsetLeft/offsetTop. Convert to
        // document coordinates with the scroll offset for absolute positioning.
        if (!eventBox || !ref.current) {
            return;
        }
        const popupHeight = ref.current.offsetHeight;
        const popupWidth = ref.current.offsetWidth;
        const docTop = window.scrollY + eventBox.top;

        if (eventBox.left + eventBox.width + 255 > window.innerWidth) {
            setSide("left")
            setBox({
                top: docTop - popupHeight / 2 + 'px',
                left: window.scrollX + eventBox.left - popupWidth - 10 + 'px',
            });
        } else {
            setSide("right")
            setBox({
                top: docTop - eventBox.height / 2 - popupHeight / 2 + 'px',
                left: window.scrollX + eventBox.left + eventBox.width + 10 + 'px',
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
                    <h2>{props.event.title}</h2>
                    <p>{parseDate(dayjs(props.event.start), dayjs(props.event.end))}</p>
                    <a className="components-button is-primary" href={props.event.url}>visit</a>
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
