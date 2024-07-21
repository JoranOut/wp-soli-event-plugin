import './date-list-view-item.scss';
import {useState, useEffect, forwardRef} from '@wordpress/element';

import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import 'dayjs/locale/nl';

import {ROOM_NAMES} from "../../../../../inc/values";


function LocationWarning(props) {
    const [location, setLocation] = useState(props.location);

    useEffect(() => setLocation(props.location), [props])

    if (!location) {
        return;
    }

    return (
        <p className="location">{location}</p>
    );
}

export const DateListViewItem = forwardRef(function DateListViewItem(props, ref) {
    const [startDate, setStartDate] = useState(dayjs(props.date.startDate));
    const [endDate, setEndDate] = useState(dayjs(props.date.endDate));
    const [location, setLocation] = useState(props.date.location);
    const [rooms, setRooms] = useState(props.date.rooms);

    dayjs.locale("nl");

    const isSameDay = (d1, d2) => {
        return d1.date() === d2.date() &&
            d1.month() === d2.month() &&
            d1.year() === d2.year();
    }


    const displayRooms = (rooms) => {
        if (rooms && rooms.length > 0) {
            return rooms.map(i => ROOM_NAMES[i]).join(' + ');
        }
        return null;
    }

    const returnSpecialLocation = (itemLocation, itemRooms) => {
        if (itemLocation) {
            return itemLocation?.name;
        }

        if (itemRooms){
            return displayRooms(itemRooms);
        }

        return "geen locatie";
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
        <div className={["date-list-view-item", endDate.isAfter(today) ? "future" : "past"].join(' ')}
             ref={ref}>
            <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={'nl'}
            >
                <span>{startDate.format("DD MMMM YYYY (dddd)")}</span>
                <span>{startDate.format("HH:mm")}</span>
                <span> - </span>
                <span>{endDate.format("HH:mm")}</span>
                <span>{!isSameDay(startDate, endDate) ? endDate.format("DD MMMM YYYY (dddd)") : ""}</span>
                <LocationWarning location={() => returnSpecialLocation(location, rooms)}/>
            </LocalizationProvider>
        </div>);
});

export default DateListViewItem;
