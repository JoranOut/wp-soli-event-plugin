import "./index.scss"
import EditorStyleScope from "../../../inc/editor-style-scope";
import {__} from '@wordpress/i18n';
import {InspectorControls} from '@wordpress/block-editor';
import {PanelBody, TextControl} from '@wordpress/components';
import ReservationPopup from "./components/reservation-popup/reservation-popup";

wp.blocks.registerBlockType("soli/event-reservation-popup", {
    title: __("Event Reservation Popup", "soli-event"),
    icon: "tagcloud",
    category: "soli",
    attributes: {
        recipient: {type: 'string', default: ''},
    },
    edit: EditComponent
})

function EditComponent({attributes, setAttributes}) {
    return (
        <>
            <InspectorControls>
                <PanelBody title={__("Reservation e-mail", "soli-event")} initialOpen={true}>
                    <TextControl
                        label={__("Recipient e-mail address", "soli-event")}
                        help={__("The generated reservation e-mail is addressed to this public address. Leave empty to let the visitor fill in the recipient themselves.", "soli-event")}
                        type="email"
                        value={attributes.recipient}
                        onChange={(value) => setAttributes({recipient: value})}
                    />
                </PanelBody>
            </InspectorControls>
            <EditorStyleScope>
                <ReservationPopup recipient={attributes.recipient}/>
            </EditorStyleScope>
        </>
    )
}
