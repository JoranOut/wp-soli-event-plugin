import "./date-picker-button.scss"
import {Button} from "@wordpress/components"
import {useState, useEffect} from '@wordpress/element';
import {DatePicker} from '@mui/x-date-pickers/DatePicker';
import {AdapterDayjs} from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, {Dayjs} from 'dayjs';
import TextField from '@mui/material/TextField';
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import checkIcon from "../../../../../../inc/assets/img/icons/check.svg";

function DatePickerButton(props) {
    const [editMode, setEditMode] = useState(false);
    const [date, setDate] = useState(dayjs(props.date));

    const minimalDate = (newDate) => {
        return props.minimalDate && newDate <= props.minimalDate;
    }

    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    const setNewDate = (newDate) => {
        props.setDate(newDate.toDate());
        setDate(newDate);
        setEditMode(false);
    }

    useEffect(()=>{
        setDate(dayjs(props.date));
    },[props])

    return (<div className="date-picker-button">
        {!editMode && <Button onClick={() => toggleEditMode()}>
            {date && date.format("dddd D MMMM, YYYY")}</Button>}
        {editMode && <>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    displayStaticWrapperAs="desktop"
                    value={date}
                    disablePast={true}
                    onChange={(newValue) => {
                        setNewDate(dayjs(newValue));
                    }}
                    renderInput={(params) => <TextField {...params} />}
                />
            </LocalizationProvider>
            <Button onClick={() => toggleEditMode()} className="img-button">
                <img src={checkIcon}/></Button>
        </>}
    </div>)
}

export default DatePickerButton;
