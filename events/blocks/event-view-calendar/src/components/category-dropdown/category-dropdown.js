import "./category-dropdown.scss"
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputBase from '@mui/material/InputBase';
import ListItemText from '@mui/material/ListItemText';
import Select from '@mui/material/Select';
import apiFetch from '@wordpress/api-fetch';

import {useState, useEffect} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const ITEM_HEIGHT = 44;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    anchorOrigin: {vertical: 'bottom', horizontal: 'right'},
    transformOrigin: {vertical: 'top', horizontal: 'right'},
    slotProps: {
        paper: {
            className: 'soli-cal-category-menu',
            style: {
                maxHeight: ITEM_HEIGHT * 7.5 + ITEM_PADDING_TOP,
            },
        },
    },
};

// Multi-select of the categories under the 'orkesten' parent. Nothing ticked
// means no filter; a site without orchestra categories renders nothing.
export default function CategoryDropdown({categoryIds, onChange}) {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        let cancelled = false;
        apiFetch({path: 'soli_event/v1/orkesten-categories'})
            .then((response) => {
                if (!cancelled) setCategories(response || []);
            }, (error) => console.error(error));
        return () => { cancelled = true; };
    }, []);

    if (categories.length === 0) {
        return null;
    }

    const renderValue = (selected) => {
        const names = categories
            .filter(category => selected.includes(category.id))
            .map(category => category.name);
        if (names.length === 0) {
            return __("All orchestras", "soli-event");
        }
        if (names.length === 1) {
            return names[0];
        }
        /* translators: 1: first selected orchestra, 2: number of other selected orchestras */
        return sprintf(__("%1$s +%2$d", "soli-event"), names[0], names.length - 1);
    }

    return (
        <FormControl className={"category-filter" + (categoryIds.length > 0 ? " is-active" : "")}>
            <Select
                multiple
                displayEmpty
                value={categoryIds}
                onChange={(e) => onChange(e.target.value)}
                renderValue={renderValue}
                input={<InputBase/>}
                inputProps={{'aria-label': __("Filter by orchestra", "soli-event")}}
                MenuProps={MenuProps}>
                {categories.map(category => (
                    <MenuItem key={category.id} value={category.id} dense>
                        <Checkbox size="small" checked={categoryIds.includes(category.id)}/>
                        <ListItemText primary={category.name}/>
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
