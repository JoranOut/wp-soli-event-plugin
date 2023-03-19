import "./event-detail-pop-up.scss";
import '@toast-ui/calendar/dist/toastui-calendar.min.css';
import {useState, useEffect, useRef} from '@wordpress/element';

export default function EventDetailPopUp(props) {
    const [box, setBox] = useState({});
    const [side, setSide] = useState("right");
    const [outsideClickCount, setOutsideClickCount] = useState(0);
    const ref = useRef();

    const parseDate = (start, end) => {
        const startDate = start.getFullYear() + "." + ensureTwoDigits(start.getMonth()) + "." + ensureTwoDigits(start.getDate());
        const startTime = ensureTwoDigits(start.getHours()) + ":" + ensureTwoDigits(start.getMinutes());
        const endDate = end.getFullYear() + "." + ensureTwoDigits(end.getMonth()) + "." + ensureTwoDigits(end.getDate());
        const endTime = ensureTwoDigits(end.getHours()) + ":" + ensureTwoDigits(end.getMinutes());
        if (startDate === endDate) {
            return startDate + " " + startTime + " - " + endTime;
        }
        return startDate + " " + startTime + " - " + endDate + " " + endTime;
    }

    const ensureTwoDigits = (digits) => {
        return ("00" + digits).slice(-2);
    }

    useOutsideClick(ref, () => {
        if (outsideClickCount > 0) {
            props.clearEvent();
        }
        setOutsideClickCount(1)
    });

    const boxybox = (eventBox) => {
        if (eventBox) {
            if (eventBox.left + eventBox.width + 255 > window.innerWidth) {
                setSide("left")
                setBox({
                    top: window.scrollY + eventBox.top + eventBox.height / 2 + 'px',
                    left: eventBox.left + 'px',
                });
            } else {
                setSide("right")
                setBox({
                    top: window.scrollY + eventBox.top + eventBox.height / 2 + 'px',
                    left: eventBox.left + eventBox.width + 'px',
                });
            }

        }
    }

    useEffect(() => {
        boxybox(props.boundingBox);
    }, [props]);

    return (
        <>
            {props.event &&
                <div ref={ref} className={side === "left" ? "event-detail-popup left" : "event-detail-popup"} style={box}>
                    <img src={props.event.raw.featuredImage}/>
                    <h2>{props.event.title}</h2>
                    <p>{parseDate(props.event.start, props.event.end)}</p>
                    <a href={props.event.raw.guid}>visit</a>
                </div>
            }
        </>
    );
}

const useOutsideClick = (ref, callback) => {
    const handleClick = e => {
        if (ref.current && !ref.current.contains(e.target)) {
            callback();
        }
    };

    useEffect(() => {
        document.addEventListener("click", handleClick);

        return () => {
            document.removeEventListener("click", handleClick);
        };
    });
};
