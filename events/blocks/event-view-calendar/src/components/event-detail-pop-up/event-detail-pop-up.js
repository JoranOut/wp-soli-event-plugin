import "./event-detail-pop-up.scss";
import {useState, useEffect, useRef} from '@wordpress/element';
import dayjs from "dayjs";

export default function EventDetailPopUp(props) {
    const [box, setBox] = useState({});
    const [side, setSide] = useState("right");
    const [outsideClickCount, setOutsideClickCount] = useState(0);
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

    useOutsideClick(ref, () => {
        if (outsideClickCount > 0) {
            props.clearEvent();
        }
        setOutsideClickCount(1)
    });

    const boxybox = (eventBox) => {
        console.log(eventBox);
        console.log(ref)
        if (eventBox) {
            if (eventBox.offsetLeft + eventBox.width + 255 > window.innerWidth) {
                setSide("left")
                setBox({
                    top: window.scrollY + eventBox.offsetTop - ref.current.offsetHeight/2 + 'px',
                    left: eventBox.offsetLeft - ref.current.offsetWidth - 10 + 'px',
                });
            } else {
                setSide("right")
                setBox({
                    top: window.scrollY + eventBox.offsetTop - eventBox.height/2 - ref.current.offsetHeight/2 + 'px',
                    left: eventBox.offsetLeft + eventBox.width + 10 + 'px',
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
                <div ref={ref} className={["event-detail-popup", side].join(" ")} style={box}>
                    <img src={props.event.raw?.featuredImage}/>
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
