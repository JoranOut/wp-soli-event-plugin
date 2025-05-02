import "./location-picker.scss"
import {Modal, Button, ToggleControl} from "@wordpress/components"
import {useState, useEffect} from '@wordpress/element';
import LocationSearcher from "../location-searcher/location-searcher";
import LocationCreator from "../location-creator/location-creator";
import RoomsPicker from "../rooms-picker/rooms-picker";
import {displayRooms} from "../../../../../inc/values";

function LocationPicker({location, rooms, onChange}) {
    const [_location, setLocation] = useState(location);
    const [_rooms, setRooms] = useState(rooms);

    const [isOpen, setOpen] = useState(false);
    const [isInternal, setInternal] = useState(!!rooms);

    const openModal = () => {
        setOpen(true);
    }
    const closeModal = () => setOpen(false);

    const selectLocation = (rooms, location) => {
        setLocation(location);
        setRooms(rooms);
        onChange(rooms, location);
        if (rooms || location) {
            closeModal();
        }
    }

    const displayLocation = () => {
        return _location?.name;
    }

    useEffect(() => {
        setLocation(location);
        setRooms(rooms);
    }, [location, rooms]);

    return (
        <div className="location-picker">
            <Button variant="secondary" onClick={openModal}>
                {
                    displayLocation() ??
                    displayRooms(_rooms) ??
                    "Kies een locatie"
                }
            </Button>
            {isOpen && (
                <Modal
                    title="Kies een locatie"
                    onRequestClose={closeModal}
                    size={"medium"}
                    focusOnMount={true}
                    isDismissible={true}
                    shouldCloseOnEsc={true}
                    shouldCloseOnClickOutside={true}
                    __experimentalHideHeader={false}
                >
                    <div className="location-picker-modal">

                        <ToggleControl
                            label="Muziekcentrum"
                            checked={isInternal}
                            onChange={() => {
                                setInternal(!isInternal);
                            }}
                        />

                        {isInternal &&
                            <RoomsPicker
                                rooms={rooms}
                                onSave={(rooms) => selectLocation(rooms, null)}
                            />
                        }
                        {!isInternal &&
                            <>
                                <LocationSearcher
                                    location={_location}
                                    onSelected={(loc) => selectLocation(null, loc)}
                                />
                                <LocationCreator
                                    onCreated={(loc) => selectLocation(null, loc)}
                                />
                            </>
                        }
                    </div>
                </Modal>
            )}
        </div>);
}

export default LocationPicker;
