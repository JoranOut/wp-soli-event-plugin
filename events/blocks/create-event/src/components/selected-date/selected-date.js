import './selected-date.scss';
import calendarIcon from "../../../../../../inc/assets/img/icons/calendar.svg";
import locationIcon from "../../../../../../inc/assets/img/icons/pin-1.svg";
import dayjs from "dayjs";
import {useState, useEffect} from '@wordpress/element';
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {displayRooms, showVenue} from "../../../../../inc/values";


function SelectedDate(props) {
    dayjs.locale("nl");
    const [startDate, setStartDate] = useState(dayjs(props.date?.startDate));
    const [endDate, setEndDate] = useState(dayjs(props.date?.endDate));
    const [location, setLocation] = useState(props.date?.location);
    const [rooms, setRooms] = useState(props.date?.rooms);


    const isSameDay = (d1, d2) => {
        return d1.date() === d2.date() &&
            d1.month() === d2.month() &&
            d1.year() === d2.year();
    }

    let today = dayjs();

    useEffect(() => {
        setStartDate(dayjs(props.date.startDate));
        setEndDate(dayjs(props.date.endDate));
        setLocation(props.date.location);
        setRooms(props.date.rooms);
        today = dayjs();
    }, [props]);

    return (
        <div className="selected-date">
            <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={'nl'}
            >
                {endDate.isBefore(today) && <p className="warning">( ! ) Dit evenement heeft al plaatsgevonden</p>}
                <div className="date">
                    <img src={calendarIcon}/>
                    <span>{startDate.format("DD MMMM YYYY (dddd)")}</span>
                    <span>{startDate.format("HH:mm")}</span>
                    <span> - </span>
                    <span>{endDate.format("HH:mm")}</span>
                    <span>{!isSameDay(startDate, endDate) ? endDate.format("DD MMMM YYYY (dddd)") : ""}</span>
                </div>
            </LocalizationProvider>
            <div className="location">
                <img src={locationIcon}/>
                <div>
                    {location &&
                        <>
                            <span>location.name</span>
                            <span>location.address</span>
                        </>
                    }
                    {rooms &&
                        <>
                            <a href="/muziekcentrum" target="_blank">Muziekcentrum Soli</a>
                            <br/>
                            <span>{displayRooms(rooms)}</span>
                        </>
                    }
                    {!location && !rooms && <span>Geen locatie bekend</span>}
                </div>
            </div>
        </div>);
}

export default SelectedDate;
