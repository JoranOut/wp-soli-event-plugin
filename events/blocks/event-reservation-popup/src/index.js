import "./index.scss"
import {__} from '@wordpress/i18n';
import ReservationPopup from "./components/reservation-popup/reservation-popup";

wp.blocks.registerBlockType("soli/event-reservation-popup", {
    title: __("Event Reservation Popup", "soli-event"),
    icon: "tagcloud",
    category: "soli",
    edit: EditComponent
})

function EditComponent(props) {
    return (
        <ReservationPopup />
    )
}

