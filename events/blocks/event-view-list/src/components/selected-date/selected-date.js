import './selected-date.scss';
import timeIcon from "../../../../../../inc/assets/img/icons/time.svg";
import locationIcon from "../../../../../../inc/assets/img/icons/pin-1.svg";
import dayjs from "dayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {displayRooms, showVenue} from "../../../../../inc/values";
import "dayjs/locale/nl";

function SelectedDate({date}) {
    dayjs.locale("nl");
    const startDate = dayjs(date?.start);
    const endDate = dayjs(date?.end);
    const location = date?.extendedProps?.location;
    const rooms = date?.extendedProps?.rooms;

    console.log(location)

    const isSameDay = (d1, d2) => {
        return d1.date() === d2.date() &&
            d1.month() === d2.month() &&
            d1.year() === d2.year();
    }

    let today = dayjs();

    return (
        <div className="event-list-date">
            <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={'nl'}
            >
                <div className="date">
                    <img src={timeIcon}/>
                    {isSameDay(startDate, endDate) &&
                        <>
                            <span>{startDate.format("DD MMMM YYYY (dddd)")}</span>
                            <br/>
                            <span>{startDate.format("HH:mm")} - {endDate.format("HH:mm")}</span>
                        </>}
                    {!isSameDay(startDate, endDate) &&
                        <>
                            <span>{startDate.format("DD MMMM YYYY ")}</span>
                            <span>{startDate.format("HH:mm")}</span>
                            <br/>
                            <span>{endDate.format("DD MMMM YYYY ")}</span>
                            <span>{endDate.format("HH:mm")}</span>
                        </>}
                </div>
            </LocalizationProvider>
            <div className="location">
                <img src={locationIcon}/>
                {location &&
                    <>
                        <span><b>{location.name}</b></span>
                        <br/>
                        <span style={{whiteSpace: "pre-line"}}>{location.address}</span>
                    </>
                }
                {rooms &&
                    <>
                        <a href="/muziekcentrum" target="_blank"><b>Muziekcentrum Soli</b></a>
                        <br/>
                        <span>{displayRooms(rooms)}</span>
                    </>
                }
                {!location && !rooms && <span>Geen locatie bekend</span>}
            </div>
        </div>);
}

export default SelectedDate;
