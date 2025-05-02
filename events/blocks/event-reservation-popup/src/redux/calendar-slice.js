import {createSelector, createSlice} from "@reduxjs/toolkit";

const initialState = {
    viewDate: new Date().toISOString(), // List of events
};

const calendarSlice = createSlice({
    name: "calendar",
    initialState,
    reducers: {
        changeViewDate: (state, action) => {
            state.viewDate = new Date(action.payload).toISOString();
        },
    }
});

// Base selector to get raw viewDate from state
const selectViewDateRaw = (state) => state.calendar.viewDate;

// Memoized selector that converts ISO string to Date
export const selectViewDate = createSelector(
    selectViewDateRaw, // Input selector
    (viewDateString) => new Date(viewDateString) // Derived result
);

export const { changeViewDate } = calendarSlice.actions;
export default calendarSlice.reducer;
