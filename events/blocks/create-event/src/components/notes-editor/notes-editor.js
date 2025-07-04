import "./notes-editor.scss"
import {useState, useEffect} from '@wordpress/element';
import {Modal, Button} from "@wordpress/components"
import documentSVG from "../../../../../../inc/assets/img/icons/document_editing.svg";
import editSVG from "../../../../../../inc/assets/img/icons/edit.svg";
import {TextField} from "@mui/material";
import ImageButton from "../image-button/image-button";

export default function NotesEditor({notes, onChange, buttonSize = 'small', hideNotes = false, onOpen, onClose}) {
    const [_notes, setNotes] = useState(notes);
    const [_buttonSize, setButtonSize] = useState(buttonSize);
    const [_hideNotes, setHideNotes] = useState(hideNotes);

    const [isOpen, setOpen] = useState(false);

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
        setNotes(value);
    }

    const ModalContent = (
        <Modal
            title="Notepad"
            onRequestClose={closeModal}
            focusOnMount={true}
            isDismissible={true}
            size={"small"}
            shouldCloseOnEsc={true}
            shouldCloseOnClickOutside={true}
            __experimentalHideHeader={false}
        >
            <p className="notes-hint">These notes will only be visible in the admin area.</p>
            <TextField
                type="text"
                name="name"
                maxLength="65535"
                className="notes-textfield"
                value={_notes}
                multiline
                onChange={(n) => handleChange(n)}
            />
            {_notes?.length > 65535 && <span className={"error"}>Too many characters</span>}
            <Button
                type="submit"
                className="submit-button"
                variant="secondary"
                onClick={() => submit()}>Save and Exit</Button>
        </Modal>
    );

    if(_buttonSize === "line" && !_hideNotes){
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
        <div className={["notes-editor", _buttonSize].join(" ")}>
            {_buttonSize === 'line' && <img src={documentSVG}/>}
            {_notes?.length > 0 && !_hideNotes && <div className="notes-preview">
                {_notes}
            </div>}
            <ImageButton
                label={_buttonSize == 'small' ? undefined : (_notes?.length > 0 ? "Edit notes" : "Add notes")}
                className={"notes-icon"}
                src={documentSVG}
                onClick={openModal}>
            </ImageButton>

            {isOpen && ModalContent}
        </div>);
}
