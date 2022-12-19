import './date-list-item.scss';
import trashcan from '../../../../../../inc/assets/img/icons/delete.svg';
import editIcon from '../../../../../../inc/assets/img/icons/edit.svg';
import {Button} from "@wordpress/components";
import DateTimePicker from "../datetime-picker/datetime-picker";
import {useState} from '@wordpress/element';

function DateListItem(props) {
    const [edit, setEdit] = useState(false);
    const [date, setDate] = useState(props.date)

    const enableEdit = () => {
        if (!date.startTime && date.endTime) {
            setDate({...date, startTime: props.minimalDate.startTime})
        }
        if (!date.endTime && date.startTime) {
            setDate({...date, endTime: props.minimalDate.endTime})
        }
        if (!date.endTime && !date.startTime) {
            setDate({...date,
                startTime: props.minimalDate.startTime,
                endTime: props.minimalDate.endTime})
        }
        setEdit(true)
    }

    return (
        <div className='date-list-item'>
            <DateTimePicker
                minimalDate={props.minimalDate}
                date={date}
                updateDate={(date) => props.updateDate(date)}
                edit={edit}
            />
            {!edit && <Button title='edit' onClick={() => enableEdit()}><img src={editIcon}/></Button>}
            <Button title='delete' onClick={props.onDelete}><img src={trashcan}/></Button>
        </div>
    );
}

export default DateListItem;
