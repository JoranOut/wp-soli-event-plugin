import "./rooms-picker.scss"
import {FormGroup, FormControlLabel, Checkbox} from '@mui/material';
import {Button} from "@wordpress/components";

import {useState, useEffect} from '@wordpress/element';
import {ROOM_NAMES} from "../../../../../inc/values";

const initializeRooomsState = (rooms) => {
    if (!rooms || rooms.empty) {
        return ROOM_NAMES.map(() => false);
    }
    return ROOM_NAMES.map((r, i) => !!rooms.includes(i));
}

function RoomsPicker({rooms, onSave}) {
    const [_rooms, setRooms] = useState(initializeRooomsState(rooms, ROOM_NAMES));

    const saveRooms = (room, checked) => {
        _rooms[room] = checked;
        setRooms(previous => [..._rooms]);
    }

    const submit = () => {
        onSave(_rooms.flatMap((bool, index) => bool ? index : []));
    }

    useEffect(() => {
        setRooms(initializeRooomsState(rooms))
    }, [])

    return (
        <>
            <FormGroup>
                <FormControlLabel key={-1} label="Hele gebouw" className="room-checkbox" control={
                    <Checkbox
                        checked={_rooms.every(v => v === true)}
                        indeterminate={_rooms.includes(true) && !_rooms.every(v => v === true)}
                        onChange={(e) => {
                            if(e.target.checked){
                                setRooms(_rooms.map(_ => true));
                            } else {
                                setRooms(_rooms.map(_ => false));
                            }
                        }}
                    />}/>
                {ROOM_NAMES.map((name, index) => {
                    return (
                        <FormControlLabel key={index} label={name} className="room-checkbox" control={
                            <Checkbox
                                checked={_rooms[index] ?? false}
                                onChange={(e) => saveRooms(index, e.target.checked)}
                            />}/>
                    )
                })}
            </FormGroup>

            <Button
                type="submit"
                className="submit-button"
                variant="secondary"
                onClick={submit}>Opslaan</Button>
        </>
    );
}

export default RoomsPicker;
