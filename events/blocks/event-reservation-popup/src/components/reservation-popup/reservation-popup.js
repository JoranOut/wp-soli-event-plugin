import './reservation-popup.scss';

import {useState} from '@wordpress/element';
import addEventSVG from "../../../../../../inc/assets/img/icons/add event.svg";
import {Button} from "@wordpress/components"
import ReservationTool from "../reservation-tool/reservation-tool";

export default function ReservationPopup({}) {
    const [showPopup, setShowPopup] = useState(true);

    const openPopup = () => {
        setShowPopup(true);
    }

    const closePopup = () => {
        setShowPopup(false);
    }

    return (
        <div className="reservation-popup">
            <Button
                className="open-button"
                variant="secondary"
                onClick={openPopup}>
                <img src={addEventSVG}/>
                Reserveer
            </Button>
            {showPopup && (
                <ReservationTool
                    closePopup={closePopup}
                />
            )}
        </div>
    )
}
