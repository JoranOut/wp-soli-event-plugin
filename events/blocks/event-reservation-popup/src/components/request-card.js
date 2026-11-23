import {__, sprintf} from '@wordpress/i18n';
import {useId} from '@wordpress/element';
import {ROOM_NAMES, ROOM_SLUGS} from '../../../../inc/values';
import {addDays, daysBetween, formatLongDate, formatTime, minutesToTime, todayISO} from '../lib/dates';
import {conflictsFor} from '../lib/occupancy';
import {isWholeBuilding, requestProblems} from '../lib/requests';
import DayStrip from './day-strip';
import {AlertIcon, NextDayIcon, TrashIcon} from './icons';

export function requestDays(request) {
    if (!request.date) {
        return [];
    }
    if (request.multiDay && request.endDate && request.endDate > request.date) {
        return daysBetween(request.date, request.endDate);
    }
    return [request.date];
}

export default function RequestCard({request, index, occupancy, onChange, onRemove, onNextDay, canRemove}) {
    const uid = useId();
    const days = requestDays(request);
    const problems = requestProblems(request).filter((p) => p.code !== 'rooms' && p.code !== 'date');
    const conflicts = conflictsFor(request, occupancy, days);
    const wholeBuilding = isWholeBuilding(request.rooms);

    const set = (patch) => onChange({...request, ...patch});
    const toggleRoom = (slug) => set({
        rooms: request.rooms.includes(slug)
            ? request.rooms.filter((r) => r !== slug)
            : [...request.rooms, slug],
    });
    const onDrag = request.multiDay ? undefined : (from, until, room) => set({
        from: minutesToTime(from),
        until: until >= 24 * 60 ? '23:59' : minutesToTime(until),
        rooms: request.rooms.includes(room) ? request.rooms : [...request.rooms, room],
    });

    const roomName = (slug) => ROOM_NAMES[ROOM_SLUGS.indexOf(slug)];
    const heading = request.date ? formatLongDate(request.date) : __('Choose a day', 'soli-event');

    return (
        <li className="soli-reserve-card">
            <div className="soli-reserve-card__head">
                <span className="soli-reserve-card__number" aria-hidden="true">{index + 1}</span>
                <h3 className="soli-reserve-card__title" id={`${uid}-title`}>
                    <span className="screen-reader-text">
                        {/* translators: %d: request number */}
                        {sprintf(__('Request %d:', 'soli-event'), index + 1)}{' '}
                    </span>
                    {heading}
                </h3>
                <div className="soli-reserve-card__actions">
                    <button
                        type="button"
                        className="soli-reserve-icon-button"
                        onClick={onNextDay}
                        disabled={!request.date}
                        title={__('Same times, next day', 'soli-event')}
                    >
                        <NextDayIcon/>
                        <span className="screen-reader-text">{__('Same times, next day', 'soli-event')}</span>
                    </button>
                    {canRemove && (
                        <button
                            type="button"
                            className="soli-reserve-icon-button is-destructive"
                            onClick={onRemove}
                            title={__('Remove', 'soli-event')}
                        >
                            <TrashIcon/>
                            <span className="screen-reader-text">{__('Remove', 'soli-event')}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="soli-reserve-fields">
                <label className="soli-reserve-field is-date">
                    <span>{request.multiDay ? __('First day', 'soli-event') : __('Day', 'soli-event')}</span>
                    <input
                        type="date"
                        value={request.date}
                        min={todayISO()}
                        required
                        onChange={(e) => set({
                            date: e.target.value,
                            endDate: request.endDate && request.endDate > e.target.value ? request.endDate : (e.target.value ? addDays(e.target.value, 1) : ''),
                        })}
                    />
                </label>
                <label className="soli-reserve-field is-time">
                    <span>{__('From', 'soli-event')}</span>
                    <input type="time" step="900" value={request.from} required onChange={(e) => set({from: e.target.value})}/>
                </label>
                <label className="soli-reserve-field is-time">
                    <span>{__('Until', 'soli-event')}</span>
                    <input type="time" step="900" value={request.until} required onChange={(e) => set({until: e.target.value})}/>
                </label>
                {request.multiDay && (
                    <label className="soli-reserve-field is-date">
                        <span>{__('Last day', 'soli-event')}</span>
                        <input
                            type="date"
                            value={request.endDate}
                            min={request.date || todayISO()}
                            required
                            onChange={(e) => set({endDate: e.target.value})}
                        />
                    </label>
                )}
                <label className="soli-reserve-toggle">
                    <input
                        type="checkbox"
                        checked={request.multiDay}
                        onChange={(e) => set({
                            multiDay: e.target.checked,
                            endDate: request.endDate || (request.date ? addDays(request.date, 1) : ''),
                        })}
                    />
                    <span>{__('Runs past midnight or over several days', 'soli-event')}</span>
                </label>
            </div>

            <fieldset className="soli-reserve-rooms">
                <div className="soli-reserve-rooms__head">
                    <legend>{__('Rooms', 'soli-event')}</legend>
                    <button
                        type="button"
                        className="soli-reserve-link"
                        aria-pressed={wholeBuilding}
                        onClick={() => set({rooms: wholeBuilding ? [] : [...ROOM_SLUGS]})}
                    >
                        {wholeBuilding ? __('Clear rooms', 'soli-event') : __('Whole building', 'soli-event')}
                    </button>
                </div>
                {days.length === 0 && (
                    <DayStrip day={todayISO()} request={{...request, date: todayISO()}} occupancy={{status: 'idle'}} onToggleRoom={toggleRoom}/>
                )}
                {days.map((day) => (
                    <DayStrip
                        key={day}
                        day={day}
                        request={request}
                        occupancy={occupancy[day]}
                        onToggleRoom={toggleRoom}
                        onDrag={onDrag}
                        showDayLabel={days.length > 1}
                    />
                ))}
                <p className="soli-reserve-legend">
                    <span className="soli-reserve-legend__item is-busy">{__('In use', 'soli-event')}</span>
                    <span className="soli-reserve-legend__item is-slot">{__('Your request', 'soli-event')}</span>
                    {conflicts.length > 0 && <span className="soli-reserve-legend__item is-clash">{__('Overlap', 'soli-event')}</span>}
                    {!request.multiDay && <span className="soli-reserve-legend__hint">{__('Drag along a room to set the time.', 'soli-event')}</span>}
                </p>
            </fieldset>

            {(problems.length > 0 || conflicts.length > 0) && (
                <div className="soli-reserve-card__messages" aria-live="polite">
                    {problems.length > 0 && (
                        <p className="soli-reserve-message is-error">
                            <AlertIcon/>
                            {/* translators: %s: list of problems, e.g. "the date has passed" */}
                            {sprintf(__('Still to do: %s.', 'soli-event'), problems.map((p) => p.text).join(', '))}
                        </p>
                    )}
                    {conflicts.length > 0 && (
                        <div className="soli-reserve-message is-warning">
                            <AlertIcon/>
                            <div>
                                <p>{__('Something is already planned at this time:', 'soli-event')}</p>
                                <ul>
                                    {conflicts.map((c, i) => (
                                        <li key={i}>
                                            {/* translators: 1: room, 2: start time, 3: end time */}
                                            {sprintf(__('%1$s: %2$s – %3$s', 'soli-event'), roomName(c.room), formatTime(c.start), formatTime(c.end))}
                                        </li>
                                    ))}
                                </ul>
                                <p>{__('You can still send the request; we will look for a solution with you.', 'soli-event')}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}
