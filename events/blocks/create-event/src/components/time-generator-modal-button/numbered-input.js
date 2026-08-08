import * as React from 'react';
import { TextField, InputAdornment } from "@mui/material";

// A small numeric input built on @mui/material (which is already a dependency).
// It keeps the (event, value) onChange contract the callers rely on, where
// `value` is the parsed number. The previous implementation used
// `useNumberInput` from @mui/base, a package that was never installed - opening
// the count-based generator therefore crashed with a ReferenceError.
export default function NumberedInput(props) {
    const { value, min, max, onChange, endAdornment, className } = props;

    const handleChange = (event) => {
        let next = event.target.value === '' ? 0 : Number(event.target.value);
        if (Number.isNaN(next)) {
            return;
        }
        if (typeof min === 'number') {
            next = Math.max(min, next);
        }
        if (typeof max === 'number') {
            next = Math.min(max, next);
        }
        onChange?.(event, next);
    };

    return (
        <TextField
            className={className}
            type="number"
            size="small"
            value={value ?? 0}
            onChange={handleChange}
            inputProps={{ min, max }}
            InputProps={
                endAdornment
                    ? { endAdornment: <InputAdornment position="end">{endAdornment}</InputAdornment> }
                    : undefined
            }
        />
    );
}
