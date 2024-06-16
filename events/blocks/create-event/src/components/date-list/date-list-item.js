import './date-list-item.scss';
import trashcan from '../../../../../../inc/assets/img/icons/delete.svg';
import {Button} from "@wordpress/components";
import DateRangePicker from "../daterange-picker/daterange-picker";
import {useState, useEffect} from '@wordpress/element';
import LocationPicker from "../location-picker/location-picker";
import dayjs from "dayjs";

function DateListItem(props) {
    const [date, setDate] = useState(props.date)

    const updateLocation = (rooms, location) => {
        const updatedDate = { ...date, location: {...location}, rooms: {...rooms} }; // Create a new copy of the date with updated location and rooms
        setDate(updatedDate);
        props.updateDate(date);
    }

    const updateDate = (newDate) => {
        setDate(newDate);
        props.updateDate(newDate);
    }

    useEffect(() => {
        console.log('Location or rooms props changed:', props.date); // Debugging line
        setDate(props.date); // Update the date state when props.date changes
    }, [props.date]);

    let today = dayjs();

    return (
        <div className={['date-list-item', dayjs(date.endDate).isAfter(today) ? "future" : "past"].join(' ')}>
            <DateRangePicker
                minimalDate={props.minimalDate}
                date={date}
                updateDate={(date) => updateDate(date)}
                style="line"
            />
            <LocationPicker
                location={date.location}
                rooms={date.rooms}
                onChange={(rooms, location) => updateLocation(rooms, location)}
            />

            <Button title='delete' onClick={props.onDelete}><img src={trashcan}/></Button>
        </div>
    );
}

export default DateListItem;
