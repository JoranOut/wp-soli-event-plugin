import "./datetime-picker.scss"
import {useState, useEffect} from '@wordpress/element';
import TimePickerButton from "../time-picker/time-picker-button";
import DatePickerButton from "../date-picker/date-picker-button";

function DateTimePicker(props) {
    const [id, setId] = useState(props.date ? props.date.id : null)
    const [date, setDate] = useState(props.date ? props.date.date : new Date())
    const [startTime, setStartTime] = useState(props.date ? props.date.startTime : getDefaultTime())
    const [endTime, setEndTime] = useState(props.date ? props.date.endTime : getDefaultTime())

    const updateDate = (newDate, newStartTime, newEndTime) => {
        props.updateDate({id: id, date: newDate, startTime: newStartTime, endTime: newEndTime})
    }

    useEffect(()=>{
        setId(props.date ? props.date.id : null)
        setDate(props.date ? props.date.date : new Date())
        setStartTime(props.date ? props.date.startTime : getDefaultTime())
        setEndTime(props.date ? props.date.endTime : getDefaultTime())

    },[props])

    return (
        <div className="date-time-picker">
            <DatePickerButton
                date={date}
                minimalDate={props.minimalDate}
                setDate={(newDate) => {
                    setDate(newDate);
                    updateDate(newDate, startTime, endTime);
                }}
            />
            {(startTime || props.edit) && <div>
                <p> Van </p>
                <TimePickerButton
                    time={startTime}
                    setTime={(newTime) => {
                        setStartTime(newTime);
                        updateDate(date, newTime, endTime);
                    }}/>
            </div>}
            {(endTime || props.edit) && <div>
                <p> tot </p>
                <TimePickerButton
                    minimalTime={startTime}
                    time={endTime}
                    setTime={(newTime) => {
                        setEndTime(newTime);
                        updateDate(date, startTime, newTime);
                    }}
                />
            </div>}
        </div>
    )
}

function getDefaultTime(){
    return new Date().toLocaleString("nl-Nl",{hour: "2-digit", minute: "2-digit"})
}

export default DateTimePicker;
