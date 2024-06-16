import './date-list-view.scss';
import {useState, useEffect, useRef} from '@wordpress/element';
import DateListViewItem from "./date-list-view-item";
import editIcon from '../../../../../../inc/assets/img/icons/edit.svg';
import {Button, dialogClasses} from "@mui/material";
import dayjs from "dayjs";
import {ROOM_NAMES} from "../../../../../inc/values";

export default function DateListView(props) {
    const [dates, setDates] = useState(props.dates ? props.dates.repeated : null);
    const ref = useRef(null);
    let scrollTop = -100;

    const handleButtonClick = () => {
        ref.current.scrollTop = scrollTop
    }

    const editModal = () => {
        props.onEdit();
    }

    const displayRooms = (rooms) => {
        if (rooms && rooms.length > 0) {
            return rooms.map(i => ROOM_NAMES[i]).join(' + ');
        }
        return null;
    }

    const arraysEquals = (array1, array2) => {
        return array1?.length === array2?.length && array1?.every(function(value, index) { return value === array2[index]});
    }

    const returnSpecialLocation = (itemLocation, itemRooms) => {
        if (itemLocation === props.dates.main.location && arraysEquals(itemRooms, props.dates.main.rooms)) {
            return;
        }

        if (itemLocation) {
            return itemLocation?.name;
        }

        if (itemRooms){
            return displayRooms(itemRooms);
        }

        return "geen locatie";
    }

    let today = dayjs().format("YYYY-MM-DD HH::mm::ss");

    useEffect(() => {
        setDates(props.dates ? props.dates.repeated : null);
        today = dayjs().format("YYYY-MM-DD HH::mm::ss");
        ref.current.scrollTop = scrollTop
    }, [props]);

    return (
        <div className="date-list-view">
            <h3 onClick={() => handleButtonClick()}>Datums:</h3>
            <img
                className={"edit-icon"}
                src={editIcon}
                onClick={editModal}
            />
            <div className={"scroll-indicator"}>
                <div className={['date-list-items'].join(' ')}
                     ref={ref}>
                    {!!dates && dates.sort((a, b) => a.startDate < b.startDate ? -1 : 1).map((date, i) => {
                        if (date.startDate > today) {
                            scrollTop += 35;
                        }
                        return (
                            <DateListViewItem
                                key={i}
                                date={date}
                                location={returnSpecialLocation(date.location, date.rooms)}
                            />
                        );
                    })}
                </div>
            </div>
            {dates && dates.length > 6 && <Button className='expand-button'
                                                  onClick={() => handleButtonClick()}>vandaag
            </Button>}
        </div>)
}

