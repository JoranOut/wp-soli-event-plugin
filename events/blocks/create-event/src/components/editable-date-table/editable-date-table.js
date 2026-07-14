import './editable-date-table.scss';
import DateList from "../date-list/date-list";
import {useEventState} from "../events-context";

export default function EditableDateTable() {
    const {events} = useEventState();

    return (
        <div>
            {events && events.length > 0 && <DateList/>}
        </div>
    );
}
