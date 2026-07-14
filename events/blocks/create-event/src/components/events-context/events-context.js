import {createContext, useContext} from '@wordpress/element';

const EventStateContext = createContext(null);
const EventActionsContext = createContext(null);
const EventHistoryContext = createContext(null);

export function useEventState() {
    const ctx = useContext(EventStateContext);
    if (!ctx) {
        throw new Error('useEventState must be used within <EventsProvider>');
    }
    return ctx;
}

export function useEventActions() {
    const ctx = useContext(EventActionsContext);
    if (!ctx) {
        throw new Error('useEventActions must be used within <EventsProvider>');
    }
    return ctx;
}

export function useEventHistory() {
    const ctx = useContext(EventHistoryContext);
    if (!ctx) {
        throw new Error('useEventHistory must be used within <EventsProvider>');
    }
    return ctx;
}

export {EventStateContext, EventActionsContext, EventHistoryContext};
