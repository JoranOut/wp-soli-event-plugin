import "./rooms-dropdown.scss"
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import Select from '@mui/material/Select';

import {useState} from '@wordpress/element';
import {ROOM_NAMES, ROOM_SLUGS} from "../../../../../inc/values";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 5.5 + ITEM_PADDING_TOP,
        },
    },
};

export default function RoomsDropdown({rooms, onChange, disabled}) {
    const [_rooms, setRooms] = useState([...rooms]);

    const saveAllRooms = (rooms) => {
        setRooms([...rooms]);
        onChange(rooms);
    }

    const renderRooms = () => {
        if (_rooms.length === ROOM_SLUGS.length) {
            return "Hele gebouw";
        }
        return ROOM_NAMES.filter((_, index) => _rooms.includes(ROOM_SLUGS[index])).join(', ');
    }

    return (
        <>
            <FormControl variant="standard" className={"room-filter"}>
                <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    multiple
                    value={_rooms}
                    onChange={(e) => saveAllRooms(e.target.value)}
                    renderValue={renderRooms}
                    disabled={disabled}
                    MenuProps={MenuProps}>
                    {
                        ROOM_SLUGS.map((name, index) => (
                            <MenuItem key={index} value={name}>
                                <Checkbox checked={_rooms.includes(name)}/>
                                <ListItemText primary={ROOM_NAMES[index]}/>
                            </MenuItem>)
                        )
                    }
                </Select>
            </FormControl>
        </>
    );
}
