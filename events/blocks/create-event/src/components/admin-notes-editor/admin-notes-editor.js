import "./admin-notes-editor.scss"
import { __ } from '@wordpress/i18n';
import {useState, useEffect} from '@wordpress/element';
import {Modal, Button} from "@wordpress/components"
import lockSVG from "../../../../../../inc/assets/img/icons/lock.svg";
import editSVG from "../../../../../../inc/assets/img/icons/edit.svg";
import {TextField} from "@mui/material";
import ImageButton from "../image-button/image-button";

export default function AdminNotesEditor({adminNotes, onChange, buttonSize = 'small', hideNotes = false, onOpen, onClose}) {
    const [_adminNotes, setAdminNotes] = useState(adminNotes);

    const [isOpen, setOpen] = useState(false);

    // Resync when the adminNotes prop changes underneath us (undo/redo/reset).
    useEffect(() => {
        setAdminNotes(adminNotes);
    }, [adminNotes]);

    const openModal = () => {
        setOpen(true);
    }
    const closeModal = () => setOpen(false);

    useEffect(() => {
        if (isOpen && onOpen) {
            onOpen();
        } else if (!isOpen && onClose) {
            onClose();
        }
    }, [isOpen]);

    const submit = () => {
        if (_adminNotes?.length > 65535) {
            return;
        }

        onChange(_adminNotes);
        closeModal()
    }

    const handleChange = (event) => {
        const value = event.target.value;
        setAdminNotes(value.length > 0 ? value : null);
    }

    const ModalContent = (
        <Modal
            title={__("Admin Notes", "soli-event")}
            onRequestClose={closeModal}
            focusOnMount={true}
            isDismissible={true}
            size={"small"}
            shouldCloseOnEsc={true}
            shouldCloseOnClickOutside={true}
            __experimentalHideHeader={false}
        >
            <p className="notes-hint">{__("These notes will only be visible in the admin area and only to people with high access level.", "soli-event")}</p>
            <TextField
                type="text"
                name="name"
                maxLength="65535"
                className="notes-textfield"
                value={_adminNotes}
                multiline
                onChange={(n) => handleChange(n)}
            />
            {_adminNotes?.length > 65535 && <span className={"error"}>{__("Too many characters", "soli-event")}</span>}
            <Button
                type="submit"
                className="submit-button"
                variant="secondary"
                onClick={() => submit()}>{__("Close", "soli-event")}</Button>
        </Modal>
    );

    if(buttonSize === "line" && !hideNotes){
        return (
            <div className="notes admin-notes">
                <img src={lockSVG}/>
                {_adminNotes}
                <ImageButton
                    className={"edit-notes-icon"}
                    src={editSVG}
                    onClick={openModal}/>

                {isOpen && ModalContent}
            </div>
        );
    }

    return (
        <div className={["admin-notes-editor", buttonSize, _adminNotes == null ? 'empty' : ''].join(" ")}>
            {buttonSize === 'line' && <img src={lockSVG}/>}
            {_adminNotes?.length > 0 && !hideNotes && <div className="notes-preview">
                {_adminNotes}
            </div>}
            <ImageButton
                label={buttonSize == 'small' ? undefined : __("Admin notes", "soli-event")}
                className={"notes-button"}
                src={lockSVG}
                onClick={openModal}>
            </ImageButton>

            {isOpen && ModalContent}
        </div>);
}
