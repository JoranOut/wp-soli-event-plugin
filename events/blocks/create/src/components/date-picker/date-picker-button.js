import "./date-picker-button.scss"
import {DatePicker, Button} from "@wordpress/components"
import {useState} from '@wordpress/element';

function DatePickerButton(props) {
    const [modal, setModal] = useState(false);
    const [date, setDate] = useState(new Date());

    const minimalDate = (newDate) => {
        return props.minimalDate && newDate <= props.minimalDate;
    }

    const toggleModal = () => {
        setModal(!modal);
    };

    const setNewDate = (newDate) => {
        props.setDate(newDate);
        setDate(newDate);
        setModal(false);
    }

    return (<div className="date-picker-button">
        <Button onClick={() => toggleModal()}>
            {date.toLocaleString("nl-NL", {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}</Button>
        {modal && <DatePicker
            currentDate={date}
            onChange={(newDate) => setNewDate(new Date(newDate))}
            isInvalidDate={(newDate) => minimalDate(new Date(newDate))}
            onBlur={() => setModal(false)}
            __nextRemoveHelpButton
            __nextRemoveResetButton
        />}
    </div>)
}
export default DatePickerButton;
