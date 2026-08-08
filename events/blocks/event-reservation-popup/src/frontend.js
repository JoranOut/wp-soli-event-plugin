import './index.scss'
import {createRoot} from '@wordpress/element';
import ReservationPopup from "./components/reservation-popup/reservation-popup";

const divsToUpdate = document.querySelectorAll(".block-event-reservation-popup")

divsToUpdate.forEach(function (div) {
    createRoot(div).render(<ReservationPopup recipient={div.dataset.recipient} />)
})
