import './reservation-tool.scss';

import {Modal, Button} from "@wordpress/components"
import CalendarPreview from "../calendar-preview/calendar-preview";
import EventList from "../event-list/event-list";
import {Provider} from "react-redux";
import store from "../../redux/store";
import ReservationEmail from "../email-button/email-button";
import TextCopyButton from "../text-copy-button/text-copy-button";

export default function ReservationTool({closePopup}) {
    return (
        <Modal
            title="Tijdsslot(en) reserveren"
            size={"fill"}
            onRequestClose={closePopup}
            focusOnMount={true}
            isDismissible={true}
            shouldCloseOnEsc={true}
            shouldCloseOnClickOutside={true}
            __experimentalHideHeader={false}
        >
            <Provider store={store}>
                <div className="reservation-tool">
                    <CalendarPreview/>
                    <EventList/>

                    <div className="tool-buttons">
                        <Button
                            className="close-button"
                            variant="secondary"
                            onClick={closePopup}>Sluiten</Button>
                        <ReservationEmail/>
                        <TextCopyButton/>
                    </div>
                </div>
            </Provider>
        </Modal>
    )
}
