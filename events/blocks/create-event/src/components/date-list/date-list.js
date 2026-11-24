import './date-list.scss';
import {__, _n, sprintf} from '@wordpress/i18n';
import {useState, useMemo, useEffect, useRef, useCallback} from '@wordpress/element';
import DateListItem from "./date-list-item";
import {Button} from "@wordpress/components";
import {DatePicker} from '@mui/x-date-pickers/DatePicker';
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import 'dayjs/locale/nl';
import dayjs from "dayjs";
import {useEventState, useEventActions, useEventHistory} from "../events-context";
import {PAGE_SIZE, orderEvents, sortByStartDate, windowFrom, clampWindow, linkedDateId} from "./date-window";
import undoSVG from "../../../../../../inc/assets/img/icons/undo arrow-1.svg";
import resetSVG from "../../../../../../inc/assets/img/icons/refresh.svg";
import redoSVG from "../../../../../../inc/assets/img/icons/redo arrow-1.svg";

// Shows PAGE_SIZE dates at a time, starting at the next upcoming one, so an
// event with hundreds of dates stays usable. Hidden dates stay in the events
// context and are saved like any other.
export default function DateList() {
    const {events} = useEventState();
    const {replaceAllEvents} = useEventActions();
    const {undo, redo, reset, canUndo, canRedo, canReset} = useEventHistory();

    const ordered = useMemo(() => orderEvents(events), [events]);
    const total = ordered.length;

    // A link from the admin Calendar View opens the list on that date.
    const [linked] = useState(() => {
        const id = linkedDateId();
        return id === null ? null : ordered.find(({date}) => Number(date.id) === id) ?? null;
    });
    const linkedDay = linked ? dayjs(linked.date.startDate) : null;
    const [range, setRange] = useState(() => windowFrom(ordered, linkedDay ? linkedDay.startOf('day') : new Date()));
    // State index of the row being edited. It stays visible when the edit
    // moves its date outside the window.
    const [pinned, setPinned] = useState(null);
    const [goToValue, setGoToValue] = useState(linkedDay);
    const listRef = useRef(null);

    useEffect(() => {
        if (!linked) return;
        listRef.current
            ?.querySelector(`[data-date-id="${linked.date.id}"]`)
            ?.scrollIntoView?.({block: 'center'});
    }, [linked]);

    const previousTotal = useRef(total);
    useEffect(() => {
        const before = previousTotal.current;
        previousTotal.current = total;
        if (before === total) return;
        // Indices shift when rows are added or removed, so the pin is stale.
        setPinned(null);
        setRange((current) => {
            // A short list showed everything; after a bulk add, open on the
            // next upcoming date like a fresh load does.
            if (before <= PAGE_SIZE && total > PAGE_SIZE && current.start === 0 && current.end >= before) {
                return windowFrom(ordered, new Date());
            }
            // A copy lands next to its source; grow the window so it shows
            // without pushing the last visible row out.
            if (total === before + 1) {
                return {start: current.start, end: current.end + 1};
            }
            return current;
        });
    }, [total, ordered]);

    const eventsRef = useRef(events);
    eventsRef.current = events;
    const handleAddGeneratedDates = useCallback((genDates) => {
        if (!genDates?.length) return;
        replaceAllEvents([...eventsRef.current, ...genDates].sort(sortByStartDate));
    }, [replaceAllEvents]);

    const {start, end} = clampWindow(range, total);
    const inWindow = ordered.slice(start, end);
    const pinnedPosition = pinned === null ? -1 : ordered.findIndex((o) => o.index === pinned);
    const pinnedOutside = pinnedPosition !== -1 && (pinnedPosition < start || pinnedPosition >= end);
    const visible = !pinnedOutside
        ? inWindow
        : pinnedPosition < start
            ? [ordered[pinnedPosition], ...inWindow]
            : [...inWindow, ordered[pinnedPosition]];

    const hiddenBefore = start - (pinnedOutside && pinnedPosition < start ? 1 : 0);
    const hiddenAfter = total - end - (pinnedOutside && pinnedPosition >= end ? 1 : 0);

    const moveWindow = (next) => {
        setPinned(null);
        setRange(next);
    };

    const goToDate = (value) => {
        setGoToValue(value);
        if (!value?.isValid()) return;
        moveWindow(windowFrom(ordered, value.startOf('day')));
        listRef.current?.scrollIntoView?.({block: 'nearest'});
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

            <div className="date-list" ref={listRef}>
                <div className="date-list-header">
                    <div className="date-list-title">
                        <h3>{__('All dates', 'soli-event')}</h3>
                        {total > PAGE_SIZE && (
                            <span className="date-list-range">
                                {sprintf(
                                    /* translators: 1: first shown date number, 2: last shown date number, 3: total number of dates */
                                    __('Dates %1$d–%2$d of %3$d', 'soli-event'),
                                    start + 1,
                                    end,
                                    total
                                )}
                            </span>
                        )}
                    </div>
                    {total > PAGE_SIZE && (
                        <div className="date-list-tools">
                            <div className="date-list-goto">
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="nl">
                                    <DatePicker
                                        label={__('Go to date', 'soli-event')}
                                        value={goToValue}
                                        onChange={goToDate}
                                        format="D MMMM, YYYY"
                                        slotProps={{textField: {size: 'small'}}}
                                    />
                                </LocalizationProvider>
                            </div>
                            <Button variant="secondary" size="compact" onClick={() => moveWindow(windowFrom(ordered, new Date()))}>
                                {__('Upcoming', 'soli-event')}
                            </Button>
                            <Button variant="secondary" size="compact" onClick={() => moveWindow({start: 0, end: total})}>
                                {__('Show all', 'soli-event')}
                            </Button>
                        </div>
                    )}
                </div>

                {hiddenBefore > 0 && (
                    <MoreDates
                        className="date-list-more-earlier"
                        label={sprintf(
                            /* translators: %d: number of dates that become visible */
                            _n('Show %d earlier date', 'Show %d earlier dates', Math.min(PAGE_SIZE, hiddenBefore), 'soli-event'),
                            Math.min(PAGE_SIZE, hiddenBefore)
                        )}
                        hidden={hiddenBefore}
                        onClick={() => moveWindow({start: Math.max(0, start - PAGE_SIZE), end})}
                    />
                )}

                {visible.map(({date, index}) => (
                    <DateListItem
                        key={date.id || `new-${index}`}
                        index={index}
                        date={date}
                        addGeneratedDates={handleAddGeneratedDates}
                        onEdit={setPinned}
                        highlighted={linked !== null && date.id === linked.date.id}
                    />
                ))}

                {hiddenAfter > 0 && (
                    <MoreDates
                        className="date-list-more-later"
                        label={sprintf(
                            /* translators: %d: number of dates that become visible */
                            _n('Show %d later date', 'Show %d later dates', Math.min(PAGE_SIZE, hiddenAfter), 'soli-event'),
                            Math.min(PAGE_SIZE, hiddenAfter)
                        )}
                        hidden={hiddenAfter}
                        onClick={() => moveWindow({start, end: Math.min(total, end + PAGE_SIZE)})}
                    />
                )}
            </div>
        </div>
    );
}

function MoreDates({className, label, hidden, onClick}) {
    return (
        <button type="button" className={`date-list-more ${className}`} onClick={onClick}>
            <span className="date-list-more-label">{label}</span>
            <span className="date-list-more-count">
                {sprintf(
                    /* translators: %d: number of dates not shown */
                    _n('%d hidden', '%d hidden', hidden, 'soli-event'),
                    hidden
                )}
            </span>
        </button>
    );
}
