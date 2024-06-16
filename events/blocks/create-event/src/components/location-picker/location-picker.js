import "./location-picker.scss"
import {Modal, Button, ToggleControl} from "@wordpress/components"
import {useState, useEffect} from '@wordpress/element';
import LocationSearcher from "../location-searcher/location-searcher";
import LocationCreator from "../location-creator/location-creator";
import RoomsPicker from "../rooms-picker/rooms-picker";
import {ROOM_NAMES} from "../../../../../inc/values";

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
        if (rooms || location){
            closeModal();
        }
    }

    const displayRooms = () => {
        if(_rooms?.length === ROOM_NAMES.length){
            return "Hele gebouw";
        }
        if (_rooms?.length > 0){
          return _rooms.map(i => ROOM_NAMES[i]).join(' + ');
        }
        return null;
    }

    const displayLocation = () => {
        if (_location){
          return _location.name;
        }
        return null;
    }

    useEffect(() => {
        console.log('Location or rooms props changed:', location, rooms); // Debugging line
        setLocation(location);
        setRooms(rooms);
    }, [location, rooms]);

    return (
        <div className="location-picker">
            <Button variant="secondary" onClick={openModal}>
                {
                    displayLocation() ??
                    displayRooms() ??
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
                </Modal>
            )}
        </div>);
}

export default LocationPicker;
