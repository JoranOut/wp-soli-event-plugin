import "./location-creator.scss"
import { __ } from '@wordpress/i18n';
import {useState, useEffect} from '@wordpress/element';
import {Modal, Button} from "@wordpress/components"
import apiFetch from '@wordpress/api-fetch';

function LocationCreator({onCreated}) {
    const [_location, setLocation] = useState();
    const [inputs, setInputs] = useState({
        name: "",
        address: ""
    });

    const [error, setError] = useState(undefined);
    const [isLoading, setLoading] = useState(false);
    const [isOpen, setOpen] = useState(false);

    const openModal = () => {
        setOpen(true);
    }
    const closeModal = () => setOpen(false);

    const submit = (location) => {
        onCreated(location);
        setLocation(location);
        closeModal()
    }

    useEffect(() => {

    }, []);

    const postAPI = () => {
        if(inputs.name.length === 0 || inputs.address.length === 0){
            return;
        }

        apiFetch({
            path: 'soli_event/v1/location/',
            method: 'POST',
            data: inputs
        }).then(
            (location) => {
                setLoading(false)
                submit(location)
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

        <div className="location-creator">
            <Button variant="secondary" onClick={openModal}>
                {__("New location", "soli-event")}
            </Button>

            {isOpen && (
                <Modal
                    title={__("Create a location", "soli-event")}
                    onRequestClose={closeModal}
                    focusOnMount={true}
                    isDismissible={true}
                    size={"small"}
                    shouldCloseOnEsc={true}
                    shouldCloseOnClickOutside={true}
                    __experimentalHideHeader={false}
                >
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
                    <Button
                        type="submit"
                        className="submit-button"
                        variant="secondary"
                        onClick={() => postAPI()}>{__("Save and select", "soli-event")}</Button>
                </Modal>)}
        </div>);
}

export default LocationCreator;
