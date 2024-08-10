import "./notes-editor.scss"
import {useState, useEffect} from '@wordpress/element';
import {Modal, Button} from "@wordpress/components"
import documentSVG from "../../../../../../inc/assets/img/icons/document_editing.svg";
import {TextField} from "@mui/material";

export default function NotesEditor({notes, onChange, size}) {
    const [_notes, setNotes] = useState(notes);
    const [_size, setSize] = useState(size);

    const [isOpen, setOpen] = useState(false);

    const openModal = () => {
        setOpen(true);
    }
    const closeModal = () => setOpen(false);

    const submit = () => {
        if (_notes?.length > 65535) {
            return;
        }

        onChange(_notes);
        closeModal()
    }

    useEffect(() => {
        setNotes(notes)
    }, [notes]);

    useEffect(() => {
        setSize(size)
    }, [size]);

    const handleChange = (event) => {
        const value = event.target.value;
        setNotes(value);
    }

    return (
        <div className={["notes-editor", _size].join(" ")}>
            {_notes?.length > 0 && <div className="notes-preview">
                {_notes}
            </div>}
            <Button
                className={["notes-button", _notes?.length > 0 ? "" : "empty"].join(" ")}
                variant="secondary"
                onClick={openModal}>
                <img src={documentSVG}/>
            </Button>

            {isOpen && (
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
                </Modal>)}
        </div>);
}
