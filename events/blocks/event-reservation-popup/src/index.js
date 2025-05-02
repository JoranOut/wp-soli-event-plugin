import "./index.scss"
import ReservationPopup from "./components/reservation-popup/reservation-popup";

wp.blocks.registerBlockType("soli/event-reservation-popup", {
    title: "Event Reservation Popup",
    icon: "tagcloud",
    category: "soli",
    edit: EditComponent
})

function EditComponent(props) {
    return (
        <ReservationPopup />
    )
}

