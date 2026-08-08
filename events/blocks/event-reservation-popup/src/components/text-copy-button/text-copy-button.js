import './text-copy-button.scss';

import {__, sprintf} from '@wordpress/i18n';
import {Button} from "@wordpress/components"
import {useSelector} from "react-redux";
import {selectEvents} from "../../redux/events-slice";
import textIcon from "../../../../../../inc/assets/img/icons/receipt.svg";
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


const TextCopyButton = ({onCopy}) => {
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
    const content = header + reservationList + footer;

    const copyText = () => {
        navigator.clipboard.writeText(content);
    }

    return (
        <Button
            disabled={reservations.length === 0}
            variant="secondary"
            className="text-copy-button"
            onClick={copyText}>
            <img src={textIcon}/>
            {__('Copy text', 'soli-event')}
        </Button>
    );
};

export default TextCopyButton;
