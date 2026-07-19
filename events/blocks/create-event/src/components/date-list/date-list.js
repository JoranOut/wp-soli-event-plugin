import './date-list.scss';
import { __ } from '@wordpress/i18n';
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

    const sortByStartDate = (a, b) => {
        const da = dayjs(a.startDate);
        const db = dayjs(b.startDate);
        if (da.isBefore(db)) return -1;
        if (da.isAfter(db)) return 1;
        return 0;
    };

    // Render the dates ordered by start date without reordering the underlying
    // state: each row keeps its original state index so edit/delete actions
    // still target the correct event. Because this recomputes on every change,
    // editing a date's start time re-sorts the list live.
    const orderedEvents = events
        .map((date, index) => ({date, index}))
        .sort((a, b) => sortByStartDate(a.date, b.date));

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
                <Button className='undo-button' title={__('undo', 'soli-event')} onClick={undo} disabled={!canUndo}>
                    <img src={undoSVG} alt={__('undo', 'soli-event')}/>
                </Button>
                <Button className='redo-button' title={__('redo', 'soli-event')} onClick={redo} disabled={!canRedo}>
                    <img src={redoSVG} alt={__('redo', 'soli-event')}/>
                </Button>
                <Button className='reset-button' title={__('reset', 'soli-event')} onClick={reset} disabled={!canReset}>
                    <img src={resetSVG} alt={__('reset', 'soli-event')}/>
                </Button>
            </div>

            <div className="date-list">
                <h3>{__('All dates', 'soli-event')}</h3>
                {orderedEvents.map(({date, index}) => (
                    <DateListItem
                        key={date.id || index}
                        index={index}
                        date={date}
                        addGeneratedDates={handleAddGeneratedDates}
                        addDateCopy={() => handleAddDateCopy(index)}
                        onDelete={() => deleteEvent(index)}
                    />
                ))}
            </div>
        </div>
    );
}
