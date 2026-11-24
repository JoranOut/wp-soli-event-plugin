import "./event-status-selector.scss"

import {useState, useEffect} from '@wordpress/element';
import {EVENT_STATUS, EVENT_STATUS_COLOR} from "../../../../../inc/values";
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

// The dropdown has no entry for PLANNED (the table default, equal to OPTION),
// an empty status or anything else unknown; those show as OPTION.
export function selectableStatus(status) {
    return EVENT_STATUS.includes(status) ? status : EVENT_STATUS[0];
}

export default function EventStatusSelector({status, onChange}) {
    const [_status, setStatus] = useState(selectableStatus(status));

    const handleChange = (event) => {
        setStatus(event.target.value);
        onChange(event.target.value)
    };

    useEffect(() => {
        setStatus(selectableStatus(status));
    }, [status])

    return (
        <FormControl className="event-status-selector" sx={{m: 1, minWidth: 120, margin: 0}} size="small">
            <Select
                id="event-status-label"
                value={_status}
                onChange={handleChange}
                sx={{fontSize: '13px', borderRadius: 0,
                    color: EVENT_STATUS_COLOR[_status]}}
            >
                {EVENT_STATUS.map((s, i) => {
                    return (
                        <MenuItem
                            key={i}
                            value={s}
                            sx={{fontSize: '13px', color: EVENT_STATUS_COLOR[s]}}
                        >{s}</MenuItem>
                    );
                })}
            </Select>
        </FormControl>
    );
}

