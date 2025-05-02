import './index.scss'
import {render} from '@wordpress/element';
import ReservationPopup from "./components/reservation-popup/reservation-popup";

const divsToUpdate = document.querySelectorAll(".block-event-reservation-popup")

divsToUpdate.forEach(function (div) {
    render(<ReservationPopup />, div)
})
