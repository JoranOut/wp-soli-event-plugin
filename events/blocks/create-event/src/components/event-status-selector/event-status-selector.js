import "./event-status-selector.scss"

import {useState, useEffect} from '@wordpress/element';
import {EVENT_STATUS, EVENT_STATUS_COLOR} from "../../../../../inc/values";
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export default function EventStatusSelector({status, onChange}) {
    const [_status, setStatus] = useState((status && status.length > 0) ? status : EVENT_STATUS[0]);

    const handleChange = (event) => {
        setStatus(event.target.value);
        onChange(event.target.value)
    };

    useEffect(() => {
        setStatus((status && status.length > 0) ? status : EVENT_STATUS[0]);
    }, [status])

    return (
        <FormControl className="event-status-selector" sx={{m: 1, minWidth: 120, margin: 0}} size="small">
            <Select
                id="event-status-label"
                value={_status}
                onChange={handleChange}
                sx={{fontSize: '13px', borderRadius: 0,
                    color: EVENT_STATUS_COLOR[status]}}
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

