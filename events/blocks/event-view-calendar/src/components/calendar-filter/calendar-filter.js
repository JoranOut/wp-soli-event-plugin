import "./calendar-filter.scss"
import {FormGroup, FormControlLabel} from '@mui/material';
import Switch from '@mui/material/Switch';

import {useState} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
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
        // Only append the toggle tokens that are actually on - pushing
        // `false` into the array pollutes the wrapper className and the
        // rooms-dropdown value.
        const toggles = [];
        if (_concertOnly) toggles.push("only-concerts");
        if (_internalEventsOnly) toggles.push("only-internal");
        onChange([...roomFilters, ...toggles]);
    }

    return (
        <FormGroup className={"calendar-filter"}>
            <FormControlLabel
                control={<Switch checked={_concertOnly} onChange={(e) => updateConcertOnly(e.target.checked)} />}
                label={__("Concerts only", "soli-event")}
            />
            {showRoomFilters && (
                <>
                    <FormControlLabel
                        control={<Switch checked={_internalEventsOnly} onChange={(e) => updateInternalEventsOnly(e.target.checked)} />}
                        label={__("Music centre only", "soli-event")}
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
