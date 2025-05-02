import { configureStore } from "@reduxjs/toolkit";
import eventsReducer from "./events-slice";
import calenderReducer from "./calendar-slice";

const store = configureStore({
    reducer: {
        events: eventsReducer,
        calendar: calenderReducer
    },
});

export default store;
