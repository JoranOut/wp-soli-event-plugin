import './reservation-tool.scss';

import {__} from '@wordpress/i18n';
import {Modal, Button} from "@wordpress/components"
import CalendarPreview from "../calendar-preview/calendar-preview";
import EventList from "../event-list/event-list";
import {Provider} from "react-redux";
import store from "../../redux/store";
import ReservationEmail from "../email-button/email-button";
import TextCopyButton from "../text-copy-button/text-copy-button";

export default function ReservationTool({closePopup, recipient}) {
    return (
        <Modal
            title={__('Reserve time slot(s)', 'soli-event')}
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
                    <div className="reservation-tool-panels">
                        <CalendarPreview/>
                        <EventList/>
                    </div>

                    <div className="tool-buttons">
                        <Button
                            className="close-button"
                            variant="secondary"
                            onClick={closePopup}>{__('Close', 'soli-event')}</Button>
                        <TextCopyButton/>
                        <ReservationEmail recipient={recipient}/>
                    </div>
                </div>
            </Provider>
        </Modal>
    )
}
