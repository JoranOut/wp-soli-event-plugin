import './email-button.scss';

import {Button} from "@wordpress/components"
import {useSelector} from "react-redux";
import {selectEvents} from "../../redux/events-slice";
import mailIcon from "../../../../../../inc/assets/img/icons/mail.svg";
import {ROOM_NAMES, ROOM_SLUGS} from "../../../../../inc/values";
import dayjs from "dayjs";
import 'dayjs/locale/nl';
import customParseFormat from "dayjs/plugin/customParseFormat";


function renderRooms(selected){
    if (selected.length === ROOM_SLUGS.length) {
        return "Hele gebouw";
    }
    return ROOM_NAMES.filter((_, index) => selected.includes(ROOM_SLUGS[index])).join(', ');
}


const ReservationEmail = ({onSend}) => {
    const rawReservations = useSelector(selectEvents);
    const reservations = !rawReservations ? [] : rawReservations.map(r => { return {
        start: dayjs(r.beginDate).format("DD MMMM YYYY (dddd) HH:mm"),
        end: dayjs(r.endDate).format("DD MMMM YYYY (dddd) HH:mm"),
        rooms: renderRooms(r.rooms)
    }})


    dayjs.locale("nl");
    dayjs.extend(customParseFormat);

    const header = "Beste Muziekvereniging Soli,\n\n" +
        "Ik zou graag de volgende ruimtes willen reserveren:\n\n";
    const reservationList = reservations
        .map(r => `♫ ${r.rooms}:\n     van: ${r.start}   tot: ${r.end}`)
        .join('\n\n');
    const footer = "\n\nMet vriendelijke groet,\n[Uw Naam]";
    const emailBody = header + reservationList + footer;

    // URL-encode the email body for the mailto link.
    const mailtoLink = `mail` + `to` + `:recipient@` + `example.com?subject='Reservering ruimte Soli Muziekcentrum'&body=${encodeURIComponent(emailBody)}`;

    const sendEmail = () => {
        window.location = mailtoLink;
    }

    return (
        <Button
            disabled={reservations.length === 0}
            variant="primary"
            className="email-button"
            onClick={sendEmail}>
            <img src={mailIcon}/>
            Genereer Mail
        </Button>
    );
};

export default ReservationEmail;
