import apiFetch from '@wordpress/api-fetch';
import {useEffect, useState} from '@wordpress/element';
import {addDays, parseLocal} from './dates';

// One request per day, shared by every card that shows that day.
const cache = new Map();

function toBusy(rows) {
    return (rows || []).flatMap((row) => {
        let rooms;
        try {
            rooms = JSON.parse(row.rooms || '[]');
        } catch (e) {
            rooms = [];
        }
        const start = parseLocal(row.start_date);
        const end = parseLocal(row.end_date);
        if (!Array.isArray(rooms) || !rooms.length || !start || !end) {
            return [];
        }
        return [{id: row.id, rooms, start, end}];
    });
}

function loadDay(day) {
    if (!cache.has(day)) {
        const promise = apiFetch({path: `soli_event/v1/events/?start_date=${day}&end_date=${addDays(day, 1)}`})
            .then(toBusy)
            .catch((error) => {
                cache.delete(day);
                throw error;
            });
        cache.set(day, promise);
    }
    return cache.get(day);
}

export default function useOccupancy(days) {
    const [state, setState] = useState({});
    const key = days.join(',');

    useEffect(() => {
        let active = true;
        days.forEach((day) => {
            setState((prev) => (prev[day]?.status === 'ready' ? prev : {...prev, [day]: {status: 'loading'}}));
            loadDay(day).then(
                (busy) => active && setState((prev) => ({...prev, [day]: {status: 'ready', busy}})),
                () => active && setState((prev) => ({...prev, [day]: {status: 'error'}}))
            );
        });
        return () => {
            active = false;
        };
    }, [key]);

    return state;
}
