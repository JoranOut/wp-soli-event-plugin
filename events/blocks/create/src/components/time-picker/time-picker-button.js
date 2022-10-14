import "./time-picker-button.scss"
import {TextControl, Button} from "@wordpress/components"
import {useState} from '@wordpress/element';
import TimeDropdownButton from "../time-dropdown/time-dropdown-button";

function TimePickerButton(props) {
    const [time, setTime] = useState(addZeroIfSingleDigit(props.time ?? {hours: 0, minutes: 0}));
    const [edit, setEdit] = useState(false);

    const validateNumber = (newTime) => {
        return !isNaN(newTime.hours) && !isNaN(newTime.minutes);
    };

    const validateTime = (newTime) => {
        return 0 <= newTime.hours && newTime.hours < 24 && 0 <= newTime.minutes && newTime.minutes < 60;
    };

    const validateMinimalTime = (newTime) => {
        // TODO
        return true;
        // return !props.minimalTime
        //     && newTime.hours > props.minimalTime.hours
        //     && newTime.minutes > props.minimalTime.minutes;
    };

    function addZeroIfSingleDigit(time) {
        return {
            hours: ('00' + time.hours).slice(-2), minutes: ('00' + time.minutes).slice(-2)
        };
    }

    const setHours = (newHours) => {
        const newTime = {hours: newHours, minutes: time.minutes};
        if (validateNumber(newTime) && validateTime(newTime) && validateMinimalTime(newTime)) {
            setTime(newTime);
        }
    };

    const setMinutes = (newMinutes) => {
        const newTime = {hours: time.hours, minutes: newMinutes};
        if (validateNumber(newTime) && validateTime(newTime) && validateMinimalTime(newTime)) {
            setTime(newTime);
        }
    };

    const toggleEdit = () => {
        setEdit(!edit);
    };

    return (<div className="time-picker-button">
        {!edit && <Button onClick={(edit) => toggleEdit(edit)}>
            {time.hours}:{time.minutes}</Button>}
        {edit && <div className="components-time">
            <TextControl
                value={time.hours}
                onChange={(newHours) => setHours(newHours)}
                onBlur={() => addZeroIfSingleDigit()}
            />
            <p>:</p>
            <TextControl
                value={time.minutes}
                onChange={(newMinutes) => setMinutes(newMinutes)}
                onBlur={() => {
                    addZeroIfSingleDigit();
                    toggleEdit();
                }}
            />
            <TimeDropdownButton
                setTime={(newTime) => setTime(newTime)}
                onBlur={() => toggleEdit()}
            />
        </div>}
    </div>)
}

export default TimePickerButton;
