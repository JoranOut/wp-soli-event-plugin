import "./concert-status-switch.scss"

import {useState, useEffect} from '@wordpress/element';
import Switch from '@mui/material/Switch';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

export default function ConcertStatusSwitch({concertStatus, onChange}) {
    const [_concertStatus, setStatus] = useState(concertStatus ?? false);

    const handleChange = (event) => {
        setStatus(event.target.checked);
        onChange(event.target.checked)
    };

    useEffect(() => {
        setStatus(concertStatus ?? false);
    }, [concertStatus])

    return (
        <FormControl className="concert-status-switch" sx={{m: 1, minWidth: 120, margin: 0}}>
            <FormControlLabel control={
                <Switch
                    checked={_concertStatus}
                    onChange={handleChange}
                    inputProps={{ 'aria-label': 'controlled' }}
                />}
              label="concert"
            />
        </FormControl>
    );
}

