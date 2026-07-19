import './reservation-popup.scss';

import {__} from '@wordpress/i18n';
import {useState} from '@wordpress/element';
import addEventSVG from "../../../../../../inc/assets/img/icons/add event.svg";
import {Button} from "@wordpress/components"
import ReservationTool from "../reservation-tool/reservation-tool";

export default function ReservationPopup({recipient}) {
    const [showPopup, setShowPopup] = useState(false);

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
                {__('Reserve', 'soli-event')}
            </Button>
            {showPopup && (
                <ReservationTool
                    closePopup={closePopup}
                    recipient={recipient}
                />
            )}
        </div>
    )
}
