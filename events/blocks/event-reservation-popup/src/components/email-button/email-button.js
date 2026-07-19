import './email-button.scss';

import {__, sprintf} from '@wordpress/i18n';
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
        return __('Whole building', 'soli-event');
    }
    return ROOM_NAMES.filter((_, index) => selected.includes(ROOM_SLUGS[index])).join(', ');
}


const ReservationEmail = ({onSend, recipient}) => {
    const rawReservations = useSelector(selectEvents);
    const reservations = !rawReservations ? [] : rawReservations.map(r => { return {
        start: dayjs(r.beginDate).format("DD MMMM YYYY (dddd) HH:mm"),
        end: dayjs(r.endDate).format("DD MMMM YYYY (dddd) HH:mm"),
        rooms: renderRooms(r.rooms)
    }})


    dayjs.locale("nl");
    dayjs.extend(customParseFormat);

    const header = __('Dear Muziekvereniging Soli,\n\n', 'soli-event') +
        __('I would like to reserve the following rooms:\n\n', 'soli-event');
    const reservationList = reservations
        .map(r => sprintf(__('♫ %1$s:\n     from: %2$s   to: %3$s', 'soli-event'), r.rooms, r.start, r.end))
        .join('\n\n');
    const footer = __('\n\nKind regards,\n[Your name]', 'soli-event');
    const emailBody = header + reservationList + footer;

    // URL-encode the email body for the mailto link. The recipient is supplied
    // by the block (data-recipient), defaulting server-side to the site admin.
    const to = recipient || '';
    const subject = encodeURIComponent(__('Room reservation Soli Muziekcentrum', 'soli-event'));
    const mailtoLink = `mailto:${to}?subject=${subject}&body=${encodeURIComponent(emailBody)}`;

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
            {__('Generate email', 'soli-event')}
        </Button>
    );
};

export default ReservationEmail;
