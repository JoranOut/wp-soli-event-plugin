import "./notes-editor.scss"
import { __ } from '@wordpress/i18n';
import {useState, useEffect} from '@wordpress/element';
import {Modal, Button} from "@wordpress/components"
import documentSVG from "../../../../../../inc/assets/img/icons/document_editing.svg";
import editSVG from "../../../../../../inc/assets/img/icons/edit.svg";
import {TextField} from "@mui/material";
import ImageButton from "../image-button/image-button";

export default function NotesEditor({notes, onChange, buttonSize = 'small', hideNotes = false, onOpen, onClose}) {
    const [_notes, setNotes] = useState(notes);

    const [isOpen, setOpen] = useState(false);

    // Resync when the notes prop changes underneath us (undo/redo/reset), so the
    // preview and the modal don't keep editing a stale copy.
    useEffect(() => {
        setNotes(notes);
    }, [notes]);

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
        if (_notes?.length > 65535) {
            return;
        }

        onChange(_notes);
        closeModal()
    }

    const handleChange = (event) => {
        const value = event.target.value;
        setNotes(value.length > 0 ? value : null);
    }

    const ModalContent = (
        <Modal
            title={__("Notepad", "soli-event")}
            onRequestClose={closeModal}
            focusOnMount={true}
            isDismissible={true}
            size={"small"}
            shouldCloseOnEsc={true}
            shouldCloseOnClickOutside={true}
            __experimentalHideHeader={false}
        >
            <p className="notes-hint">{__("These notes will only be visible in the admin area.", "soli-event")}</p>
            <TextField
                type="text"
                name="name"
                maxLength="65535"
                className="notes-textfield"
                value={_notes}
                multiline
                onChange={(n) => handleChange(n)}
            />
            {_notes?.length > 65535 && <span className={"error"}>{__("Too many characters", "soli-event")}</span>}
            <Button
                type="submit"
                className="submit-button"
                variant="secondary"
                onClick={() => submit()}>{__("Close", "soli-event")}</Button>
        </Modal>
    );

    if(buttonSize === "line" && !hideNotes){
        return (
            <div className="notes">
                <img src={documentSVG}/>
                {_notes}
                <ImageButton
                    className={"edit-notes-icon"}
                    src={editSVG}
                    onClick={openModal}/>

                {isOpen && ModalContent}
            </div>
        );
    }

    return (
        <div className={["notes-editor", buttonSize, _notes == null ? 'empty' : ''].join(" ")}>
            {buttonSize === 'line' && <img src={documentSVG}/>}
            {_notes?.length > 0 && !hideNotes && <div className="notes-preview">
                {_notes}
            </div>}
            <ImageButton
                label={buttonSize == 'small' ? undefined : (_notes?.length > 0 ? __("Edit notes", "soli-event") : __("Add notes", "soli-event"))}
                className={"notes-icon"}
                src={documentSVG}
                onClick={openModal}>
            </ImageButton>

            {isOpen && ModalContent}
        </div>);
}
