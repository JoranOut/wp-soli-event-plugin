import {toHash} from './events-hash';

export const ActionTypes = {
    INIT: 'INIT',
    REPLACE_ALL: 'REPLACE_ALL',
    UPDATE_EVENT: 'UPDATE_EVENT',
    ADD_EVENT: 'ADD_EVENT',
    ADD_EVENTS: 'ADD_EVENTS',
    DELETE_EVENT: 'DELETE_EVENT',
    UNDO: 'UNDO',
    REDO: 'REDO',
    RESET: 'RESET',
};

function withHistory(state, nextEvents) {
    const newHash = toHash(nextEvents);
    const baseHistory = state.history.slice(0, state.historyIndex + 1);
    const newHistory = [...baseHistory, nextEvents];
    const newIndex = baseHistory.length;

    return {
        ...state,
        events: nextEvents,
        history: newHistory,
        historyIndex: newIndex,
        currentHash: newHash,
        isDirty: state.initialHash != null && newHash !== state.initialHash,
    };
}

export function createInitialState({mode = 'admin', readOnly = false} = {}) {
    return {
        events: [],
        history: [],
        historyIndex: -1,
        initialHash: null,
        currentHash: null,
        isDirty: false,
        mode,
        readOnly,
        isInitialized: false,
    };
}

export function eventsReducer(state, action) {
    switch (action.type) {
        case ActionTypes.INIT: {
            const events = action.payload.events ?? [];
            const hash = toHash(events);
            return {
                ...state,
                events,
                history: [events],
                historyIndex: 0,
                initialHash: hash,
                currentHash: hash,
                isDirty: false,
                isInitialized: true,
            };
        }

        case ActionTypes.REPLACE_ALL: {
            return withHistory(state, action.payload.events ?? []);
        }

        case ActionTypes.UPDATE_EVENT: {
            const {index, patch} = action.payload;
            if (index < 0 || index >= state.events.length) return state;
            const nextEvents = state.events.map((e, i) =>
                i === index ? {...e, ...patch} : e
            );
            return withHistory(state, nextEvents);
        }

        case ActionTypes.ADD_EVENT: {
            const {event, index} = action.payload;
            const eventsCopy = [...state.events];
            if (typeof index === 'number' && index >= 0 && index <= eventsCopy.length) {
                eventsCopy.splice(index, 0, event);
            } else {
                eventsCopy.push(event);
            }
            return withHistory(state, eventsCopy);
        }

        case ActionTypes.ADD_EVENTS: {
            const {events: newEvents} = action.payload;
            if (!newEvents?.length) return state;
            const merged = [...state.events, ...newEvents];
            return withHistory(state, merged);
        }

        case ActionTypes.DELETE_EVENT: {
            const {index} = action.payload;
            if (index < 0 || index >= state.events.length) return state;
            const nextEvents = state.events.filter((_, i) => i !== index);
            return withHistory(state, nextEvents);
        }

        case ActionTypes.UNDO: {
            if (state.historyIndex <= 0) return state;
            const newIndex = state.historyIndex - 1;
            const events = state.history[newIndex];
            const hash = toHash(events);
            return {
                ...state,
                events,
                historyIndex: newIndex,
                currentHash: hash,
                isDirty: state.initialHash != null && hash !== state.initialHash,
            };
        }

        case ActionTypes.REDO: {
            if (state.historyIndex >= state.history.length - 1) return state;
            const newIndex = state.historyIndex + 1;
            const events = state.history[newIndex];
            const hash = toHash(events);
            return {
                ...state,
                events,
                historyIndex: newIndex,
                currentHash: hash,
                isDirty: state.initialHash != null && hash !== state.initialHash,
            };
        }

        case ActionTypes.RESET: {
            if (!state.history.length) return state;
            const events = state.history[0];
            const hash = toHash(events);
            return {
                ...state,
                events,
                historyIndex: 0,
                currentHash: hash,
                isDirty: state.initialHash != null && hash !== state.initialHash,
            };
        }

        default:
            return state;
    }
}
