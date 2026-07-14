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
        const prevState = stateRef.current;
        const prevEvents = prevState.events;

        rawDispatch(action);

        if (action.type !== ActionTypes.INIT) {
            const nextState = eventsReducer(prevState, action);
            console.groupCollapsed(
                `%c[EventsContext] ${action.type}`,
                'color: #6366f1; font-weight: bold;'
            );
            console.log('Payload:', action.payload);
            console.log('Prev events:', prevEvents);
            console.log('Next events:', nextState.events);
            console.log('Is dirty:', nextState.isDirty);
            console.log('History index:', nextState.historyIndex, '/', nextState.history.length - 1);
            console.groupEnd();
        }
    }, []);

    useEffect(() => {
        if (!state.isInitialized && initialEvents) {
            dispatch({
                type: ActionTypes.INIT,
                payload: {events: initialEvents},
            });
            console.log(
                `%c[EventsContext] INIT`,
                'color: #22c55e; font-weight: bold;',
                'Loaded', initialEvents?.length ?? 0, 'events'
            );
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
