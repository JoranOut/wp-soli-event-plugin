import './date-list.scss';
import DateListItem from "./date-list-item";
import undo from "../../../../../../inc/assets/img/icons/undo arrow-1.svg";
import reset from "../../../../../../inc/assets/img/icons/refresh.svg";
import {Button} from "@wordpress/components";

function DateList(props) {
    return (
        <div className="date-list">
            {props.showUndoAndReset && <Button className='undo-button' title='undo' onClick={props.onUndo}><img src={undo}/></Button>}
            {props.showUndoAndReset && <Button className='reset-button' title='reset' onClick={props.onReset}><img src={reset}/></Button>}
            <h3>Datums</h3>
            {props.dates.map((date,i) => {
                return (
                    <DateListItem
                        key={i}
                        date={date}
                        onDelete={()=>props.onDelete(i)}
                    />
                );
            })}
        </div>
    );
}
export default DateList;
