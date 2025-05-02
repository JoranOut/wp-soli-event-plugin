import {createSelector, createSlice} from "@reduxjs/toolkit";

const initialState = {
    events: [], // List of events
};

const eventsSlice = createSlice({
    name: "event",
    initialState,
    reducers: {
        addEvent: (state, action) => {
            state.events.push(action.payload);
        },
        updateEvent: (state, action) => {
            const index = state.events.findIndex(event => event.id === action.payload.id);
            if (index !== -1) {
                state.events[index] = action.payload;
            }
        },
        deleteEvent: (state, action) => {
            state.events = state.events.filter(event => event.id !== action.payload);
        }
    }
});


const selectEventsRaw = (state) => state.events.events;

// Memoized selector that converts ISO strings to Date
export const selectEvents = createSelector(
    [selectEventsRaw],
    (events) => {
        return events.map(event => {
            return {
                ...event,
                beginDate: new Date(event.beginDate),
                endDate: new Date(event.endDate)
            }
        });
    }
);

export const { addEvent, updateEvent, deleteEvent } = eventsSlice.actions;
export default eventsSlice.reducer;
