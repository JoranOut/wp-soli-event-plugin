import './text-copy-button.scss';

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
        return "Hele gebouw";
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

    const header = "Beste Muziekvereniging Soli,\n\n" +
        "Ik zou graag de volgende ruimtes willen reserveren:\n\n";
    const reservationList = reservations
        .map(r => `♫ ${r.rooms}:\n     van: ${r.start}   tot: ${r.end}`)
        .join('\n\n');
    const footer = "\n\nMet vriendelijke groet,\n[Uw Naam]";
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
            Copy text
        </Button>
    );
};

export default TextCopyButton;
