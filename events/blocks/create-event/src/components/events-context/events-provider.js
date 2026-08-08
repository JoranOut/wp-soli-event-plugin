import {useReducer, useMemo, useEffect, useRef} from '@wordpress/element';
import {
    EventStateContext,
    EventActionsContext,
    EventHistoryContext,
} from './events-context';
import {
    eventsReducer,
    createInitialState,
    ActionTypes,
} from './events-reducer';
import {toHash} from './events-hash';

export default function EventsProvider({
    mode = 'admin',
    readOnly = false,
    initialEvents = null,
    onDirtyChange,
    onEventsChange,
    children,
}) {
    const [state, rawDispatch] = useReducer(
        eventsReducer,
        createInitialState({mode, readOnly})
    );

    const stateRef = useRef(state);
    stateRef.current = state;

    const dispatch = useMemo(() => (action) => {
        rawDispatch(action);
    }, []);

    useEffect(() => {
        if (!state.isInitialized && initialEvents) {
            dispatch({
                type: ActionTypes.INIT,
                payload: {events: initialEvents},
            });
        }
    }, [initialEvents, state.isInitialized, dispatch]);

    useEffect(() => {
        if (!state.isInitialized) return;
        if (onEventsChange) {
            onEventsChange(state.events);
        }
        if (onDirtyChange) {
            onDirtyChange(state.isDirty, state.currentHash);
        }
    }, [state.events, state.isDirty, state.currentHash, state.isInitialized, onEventsChange, onDirtyChange]);

    const stateValue = useMemo(
        () => ({
            ...state,
            hasMultipleEvents: state.events.length > 1,
            firstEvent: state.events[0] ?? null,
        }),
        [state]
    );

    const canMutate = !readOnly;

    const actionsValue = useMemo(
        () => ({
            replaceAllEvents: (events) => {
                if (!canMutate) return;
                dispatch({type: ActionTypes.REPLACE_ALL, payload: {events}});
            },

            // Reset the dirty baseline to a freshly persisted set of events
            // (used after a successful save so ids/hash reflect the DB).
            rebaseEvents: (events) => {
                if (!canMutate) return;
                dispatch({type: ActionTypes.INIT, payload: {events}});
            },

            updateEvent: (index, patch) => {
                if (!canMutate) return;
                dispatch({type: ActionTypes.UPDATE_EVENT, payload: {index, patch}});
            },

            updateEventDate: (index, startDate, endDate) => {
                if (!canMutate) return;
                dispatch({
                    type: ActionTypes.UPDATE_EVENT,
                    payload: {index, patch: {startDate, endDate}},
                });
            },

            updateEventLocation: (index, rooms, location) => {
                if (!canMutate) return;
                dispatch({
                    type: ActionTypes.UPDATE_EVENT,
                    payload: {index, patch: {rooms, location}},
                });
            },

            updateEventStatus: (index, status) => {
                if (!canMutate) return;
                dispatch({
                    type: ActionTypes.UPDATE_EVENT,
                    payload: {index, patch: {status}},
                });
            },

            updateEventConcertStatus: (index, concertStatus) => {
                if (!canMutate) return;
                dispatch({
                    type: ActionTypes.UPDATE_EVENT,
                    payload: {index, patch: {concertStatus}},
                });
            },

            updateEventNotes: (index, notes) => {
                if (!canMutate) return;
                dispatch({
                    type: ActionTypes.UPDATE_EVENT,
                    payload: {index, patch: {notes}},
                });
            },

            updateEventAdminNotes: (index, adminNotes) => {
                if (!canMutate) return;
                dispatch({
                    type: ActionTypes.UPDATE_EVENT,
                    payload: {index, patch: {adminNotes}},
                });
            },

            addEvent: (event, index) => {
                if (!canMutate) return;
                dispatch({
                    type: ActionTypes.ADD_EVENT,
                    payload: {event, index},
                });
            },

            addGeneratedEvents: (generatedEvents) => {
                if (!canMutate || !generatedEvents?.length) return;
                dispatch({
                    type: ActionTypes.ADD_EVENTS,
                    payload: {events: generatedEvents},
                });
            },

            duplicateEvent: (index) => {
                if (!canMutate) return;
                const source = stateRef.current.events[index];
                if (!source) return;
                const {id, ...copy} = source;
                dispatch({
                    type: ActionTypes.ADD_EVENT,
                    payload: {event: copy, index: index + 1},
                });
            },

            deleteEvent: (index) => {
                if (!canMutate) return;
                dispatch({type: ActionTypes.DELETE_EVENT, payload: {index}});
            },

            toHash,
        }),
        [canMutate, dispatch]
    );

    const historyValue = useMemo(
        () => ({
            undo: () => canMutate && dispatch({type: ActionTypes.UNDO}),
            redo: () => canMutate && dispatch({type: ActionTypes.REDO}),
            reset: () => canMutate && dispatch({type: ActionTypes.RESET}),
            canUndo: state.historyIndex > 0,
            canRedo: state.historyIndex < state.history.length - 1,
            canReset: state.historyIndex > 0,
        }),
        [state.historyIndex, state.history.length, canMutate, dispatch]
    );

    return (
        <EventStateContext.Provider value={stateValue}>
            <EventActionsContext.Provider value={actionsValue}>
                <EventHistoryContext.Provider value={historyValue}>
                    {children}
                </EventHistoryContext.Provider>
            </EventActionsContext.Provider>
        </EventStateContext.Provider>
    );
}
