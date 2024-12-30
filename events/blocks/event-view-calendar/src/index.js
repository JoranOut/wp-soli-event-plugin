import "./index.scss"
import CalendarWrapper from "./components/calendar-wrapper/calendar-wrapper";

wp.blocks.registerBlockType("soli/event-view-calendar", {
    title: "Event View Calendar",
    icon: "calendar-alt",
    category: "soli",
    edit: EditComponent
})

function EditComponent(props) {
    return (<CalendarWrapper/>)
}

