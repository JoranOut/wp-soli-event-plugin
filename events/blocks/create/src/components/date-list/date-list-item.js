import './date-list-item.scss';
import trashcan from '../../../../../../inc/assets/img/icons/delete.svg';
import {Button} from "@wordpress/components";

function DateListItem(props) {
    return (
        <div className='date-list-item'>
            <p>{props.date.toLocaleString("nl-NL", {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}</p>
            <Button title='delete' onClick={props.onDelete}><img src={trashcan}/></Button>
        </div>
    );
}
export default DateListItem;
