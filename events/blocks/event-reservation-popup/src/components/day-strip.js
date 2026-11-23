import {__, sprintf} from '@wordpress/i18n';
import {useRef} from '@wordpress/element';
import {ROOM_COLORS, ROOM_NAMES, ROOM_SLUGS} from '../../../../inc/values';
import {formatShortDate, minutesToTime} from '../lib/dates';
import {clipToDay} from '../lib/occupancy';
import {requestRange} from '../lib/requests';

const DAY = 24 * 60;
const DEFAULT_START = 7 * 60;
const SNAP = 15;

const floorHour = (m) => Math.floor(m / 60) * 60;

function overlap(a, b) {
    const from = Math.max(a.from, b.from);
    const until = Math.min(a.until, b.until);
    return until > from ? {from, until} : null;
}

function Track({room, windowStart, span, busy, slot, selected, onDrag}) {
    const drag = useRef(null);
    const pct = (m) => `${((m - windowStart) / span) * 100}%`;
    const width = (seg) => `${((seg.until - seg.from) / span) * 100}%`;

    const minuteAt = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        return Math.round((windowStart + ratio * span) / SNAP) * SNAP;
    };

    const handlers = onDrag ? {
        onPointerDown: (event) => {
            if (event.button !== 0) {
                return;
            }
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {anchor: minuteAt(event), moved: false};
        },
        onPointerMove: (event) => {
            if (!drag.current) {
                return;
            }
            const m = minuteAt(event);
            if (Math.abs(m - drag.current.anchor) >= SNAP) {
                drag.current.moved = true;
                onDrag(Math.min(m, drag.current.anchor), Math.max(m, drag.current.anchor), room);
            }
        },
        onPointerUp: () => {
            const current = drag.current;
            drag.current = null;
            if (current && !current.moved) {
                // A plain click moves the slot, keeping its length.
                const length = slot ? slot.until - slot.from : 60;
                const from = Math.min(current.anchor, DAY - length);
                onDrag(from, from + length, room);
            }
        },
        onPointerCancel: () => {
            drag.current = null;
        },
    } : {};

    return (
        <div className={`soli-reserve-track${onDrag ? ' is-draggable' : ''}`} aria-hidden="true" {...handlers}>
            {busy.map((seg, i) => (
                <span key={i} className="soli-reserve-busy" style={{left: pct(seg.from), width: width(seg)}}/>
            ))}
            {slot && (
                <span
                    className={`soli-reserve-slot${selected ? ' is-selected' : ''}`}
                    style={{left: pct(slot.from), width: width(slot)}}
                />
            )}
            {selected && slot && busy.map((seg, i) => {
                const clash = overlap(seg, slot);
                return clash && (
                    <span key={`c${i}`} className="soli-reserve-clash" style={{left: pct(clash.from), width: width(clash)}}/>
                );
            })}
        </div>
    );
}

export default function DayStrip({day, request, occupancy, onToggleRoom, onDrag, showDayLabel}) {
    const {start, end} = requestRange(request);
    const slot = clipToDay(day, start, end);
    const status = occupancy?.status || 'loading';
    const busyByRoom = Object.fromEntries(ROOM_SLUGS.map((slug) => [slug, []]));
    (occupancy?.busy || []).forEach((item) => {
        const seg = clipToDay(day, item.start, item.end);
        if (seg) {
            item.rooms.forEach((room) => busyByRoom[room]?.push(seg));
        }
    });

    const starts = [DEFAULT_START, ...(slot ? [slot.from] : []),
        ...Object.values(busyByRoom).flat().map((seg) => seg.from)];
    const windowStart = floorHour(Math.min(...starts));
    const span = DAY - windowStart;
    const ticks = [];
    for (let m = windowStart; m <= DAY; m += 60) {
        ticks.push(m);
    }

    return (
        <div className={`soli-reserve-strip is-${status}`}>
            {showDayLabel && <p className="soli-reserve-strip__day">{formatShortDate(day)}</p>}
            <div className="soli-reserve-strip__grid" style={{'--hours': span / 60}}>
                <div className="soli-reserve-axis" aria-hidden="true">
                    {ticks.map((m) => (
                        <span
                            key={m}
                            className={`soli-reserve-axis__tick${(m / 60) % 2 ? ' is-odd' : ''}`}
                            style={{left: `${((m - windowStart) / span) * 100}%`}}
                        >
                            {m === DAY ? '24' : String(m / 60).padStart(2, '0')}
                        </span>
                    ))}
                </div>
                {ROOM_SLUGS.map((slug, index) => {
                    const selected = request.rooms.includes(slug);
                    const busy = busyByRoom[slug];
                    const busyText = status !== 'ready'
                        ? ''
                        : busy.length
                            ? sprintf(
                                /* translators: %s: list of time ranges */
                                __('in use %s', 'soli-event'),
                                busy.map((seg) => `${minutesToTime(seg.from)}–${minutesToTime(seg.until)}`).join(', ')
                            )
                            : __('free all day', 'soli-event');
                    return (
                        <div className="soli-reserve-row" key={slug}>
                            <button
                                type="button"
                                className="soli-reserve-room"
                                aria-pressed={selected}
                                onClick={() => onToggleRoom(slug)}
                                style={{'--room': ROOM_COLORS[slug]}}
                            >
                                <span className="soli-reserve-room__check" aria-hidden="true"/>
                                <span className="soli-reserve-room__name">{ROOM_NAMES[index]}</span>
                                {busyText && <span className="screen-reader-text">, {busyText}</span>}
                            </button>
                            <Track
                                room={slug}
                                windowStart={windowStart}
                                span={span}
                                busy={status === 'ready' ? busy : []}
                                slot={slot}
                                selected={selected}
                                onDrag={onDrag}
                            />
                        </div>
                    );
                })}
            </div>
            {status === 'error' && (
                <p className="soli-reserve-strip__note">
                    {__('The calendar could not be loaded. You can still send your request.', 'soli-event')}
                </p>
            )}
        </div>
    );
}
