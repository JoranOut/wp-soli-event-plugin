import './date-list.scss';
import DateListItem from "./date-list-item";
import dayjs from "dayjs";
import {Button} from "@wordpress/components";
import {useEventState, useEventActions, useEventHistory} from "../events-context";
import undoSVG from "../../../../../../inc/assets/img/icons/undo arrow-1.svg";
import resetSVG from "../../../../../../inc/assets/img/icons/refresh.svg";
import redoSVG from "../../../../../../inc/assets/img/icons/redo arrow-1.svg";

export default function DateList() {
    const {events} = useEventState();
    const {replaceAllEvents, addGeneratedEvents, deleteEvent, duplicateEvent} = useEventActions();
    const {undo, redo, reset, canUndo, canRedo, canReset} = useEventHistory();

    const sortByStartDate = (a, b) =>
        dayjs(a.startDate) < dayjs(b.startDate) ? -1 : 1;

    const handleAddGeneratedDates = (genDates) => {
        if (!genDates?.length) return;
        const sorted = [...events, ...genDates].sort(sortByStartDate);
        replaceAllEvents(sorted);
    };

    const handleAddDateCopy = (index) => {
        duplicateEvent(index);
    };

    return (
        <div>
            <div className="state-buttons">
                <Button className='undo-button' title='undo' onClick={undo} disabled={!canUndo}>
                    <img src={undoSVG} alt="undo"/>
                </Button>
                <Button className='redo-button' title='redo' onClick={redo} disabled={!canRedo}>
                    <img src={redoSVG} alt="redo"/>
                </Button>
                <Button className='reset-button' title='reset' onClick={reset} disabled={!canReset}>
                    <img src={resetSVG} alt="reset"/>
                </Button>
            </div>

            <div className="date-list">
                <h3>Alle datums</h3>
                {events.map((date, i) => (
                    <DateListItem
                        key={date.id || i}
                        index={i}
                        date={date}
                        addGeneratedDates={handleAddGeneratedDates}
                        addDateCopy={() => handleAddDateCopy(i)}
                        onDelete={() => deleteEvent(i)}
                    />
                ))}
            </div>
        </div>
    );
}
