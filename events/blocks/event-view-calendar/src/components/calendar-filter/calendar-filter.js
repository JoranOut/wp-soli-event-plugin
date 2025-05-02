import "./calendar-filter.scss"
import {FormGroup, FormControlLabel} from '@mui/material';
import Switch from '@mui/material/Switch';

import {useState} from '@wordpress/element';
import RoomsDropdown from "../rooms-dropdown/rooms-dropdown";

export default function CalendarFilter({filters, onChange, showRoomFilters}) {
    const [_concertOnly, setConcertOnly] = useState(filters ? filters.includes("only-concerts") : false);
    const [_internalEventsOnly, setInternalEventsOnly] = useState(filters ? filters.includes("only-internal") : false);

    const updateConcertOnly = (concertOnly) => {
        setConcertOnly(concertOnly);
        if (concertOnly) {
            onChange([...filters, "only-concerts"]);
        } else {
            onChange([...filters].filter(f => f !== "only-concerts"));
        }
    }

    const updateInternalEventsOnly = (internalEventsOnly) => {
        setInternalEventsOnly(internalEventsOnly);
        if (internalEventsOnly) {
            onChange([...filters, "only-internal"]);
        } else {
            onChange([...filters].filter(f => f !== "only-internal"));
        }
    }

    const updateRoomFilters = (roomFilters) => {
        onChange([...roomFilters, _concertOnly && "only-concerts", _internalEventsOnly && "only-internal"]);
    }

    return (
        <FormGroup className={"calendar-filter"}>
            <FormControlLabel
                control={<Switch checked={_concertOnly} onChange={(e) => updateConcertOnly(e.target.checked)} />}
                label="alleen concerten"
            />
            {showRoomFilters && (
                <>
                    <FormControlLabel
                        control={<Switch checked={_internalEventsOnly} onChange={(e) => updateInternalEventsOnly(e.target.checked)} />}
                        label="alleen muziekcentrum"
                    />
                    <RoomsDropdown
                        rooms={filters.filter(f => f !== "only-concerts" && f !== "only-internal")}
                        onChange={updateRoomFilters}
                        disabled={!_internalEventsOnly}
                    />
                </>
            )}
        </FormGroup>
    );
}
