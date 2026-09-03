import "./location-editor.scss"
import SoliModal from "../../../../../inc/soli-modal";
import { __ } from '@wordpress/i18n';
import {useState} from '@wordpress/element';
import {Button, Notice} from "@wordpress/components"
import apiFetch from '@wordpress/api-fetch';

// Edits an existing location. A location is shared between every event date
// it is assigned to, so the modal warns that changes apply to all of them.
function LocationEditor({location, onSaved, onClose}) {
    const [inputs, setInputs] = useState({
        name: location?.name ?? "",
        address: location?.address ?? ""
    });

    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);

    const postAPI = () => {
        if (inputs.name.length === 0 || inputs.address.length === 0) {
            return;
        }

        setLoading(true);
        apiFetch({
            path: `soli_event/v1/location/${location.id}`,
            method: 'POST',
            data: inputs
        }).then(
            (saved) => {
                setLoading(false)
                onSaved(saved)
            },
            // Note: It's important to handle errors here instead of a catch() block
            // so that we don't swallow exceptions from actual bugs in components.
            (error) => {
                setLoading(false)
                setError(error)
            }
        );
    }

    const handleChange = (event) => {
        const name = event.target.name;
        const value = event.target.value;
        setInputs(values => ({...values, [name]: value}))
    }

    return (
        <SoliModal
            title={__("Edit location", "soli-event")}
            onRequestClose={onClose}
            focusOnMount={true}
            isDismissible={true}
            size={"small"}
            shouldCloseOnEsc={true}
            shouldCloseOnClickOutside={true}
            __experimentalHideHeader={false}
        >
            <div className="location-editor">
                <Notice status="warning" isDismissible={false}>
                    {__("This location is shared: changes apply to every event date it is assigned to.", "soli-event")}
                </Notice>
                <form>
                    <label>{__("Location name*", "soli-event")}</label>
                    <input
                        type="text"
                        name="name"
                        value={inputs.name}
                        onChange={handleChange}
                    />
                    {inputs.name.length > 0 || <span className={"error"}>{__("required", "soli-event")}</span>}

                    <label>{__("Location address*", "soli-event")}</label>
                    <textarea
                        rows="3"
                        name="address"
                        value={inputs.address}
                        onChange={handleChange}
                    />
                    {inputs.address.length > 0 || <span className={"error"}>{__("required", "soli-event")}</span>}
                </form>
                {error && <span className="error">{error.message}</span>}
                <Button
                    className="submit-button"
                    variant="secondary"
                    isBusy={isLoading}
                    onClick={() => postAPI()}>{__("Save changes", "soli-event")}</Button>
            </div>
        </SoliModal>
    );
}

export default LocationEditor;
