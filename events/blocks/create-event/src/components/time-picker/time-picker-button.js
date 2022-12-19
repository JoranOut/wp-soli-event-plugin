import "./time-picker-button.scss"
import {Button} from "@wordpress/components"
import {useState, useEffect} from '@wordpress/element';
import TimeField from "react-simple-timefield";
import checkIcon from '../../../../../../inc/assets/img/icons/check.svg';
import timeIcon from '../../../../../../inc/assets/img/icons/time.svg';

function TimePickerButton(props) {
    const [time, setTime] = useState(props.time ?? "00:00");
    const [edit, setEdit] = useState(false);

    const validateMinimalTime = (newTime) => {
        // TODO
        return true;
        // return !props.minimalTime
        //     && newTime.hours > props.minimalTime.hours
        //     && newTime.minutes > props.minimalTime.minutes;
    };

    const toggleEdit = () => {
        setEdit(!edit);
    };

    const onTimeChange = (event) => {
        setTime(event.target.value)
        props.setTime(event.target.value)
    };

    useEffect(()=>{
        if (!edit){
            setTime(props.time ?? "00:00");
        }
    }, [props])

    return (<div className="time-picker-button">
        {!edit && <>
            <Button onClick={() => toggleEdit()}>{time}</Button>
            <Button onClick={() => toggleEdit()} className="img-button">
                <img src={timeIcon}/></Button>
        </>}
        {edit && <>
            <TimeField
                value={time}
                onChange={onTimeChange}
                style={{width: "60px"}}/>
            <Button onClick={() => toggleEdit()} className="img-button">
                <img src={checkIcon}/></Button>
        </>}
    </div>)
}

export default TimePickerButton;
