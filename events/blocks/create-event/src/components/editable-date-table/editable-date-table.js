import './editable-date-table.scss';

import {useState, useEffect} from '@wordpress/element';
import DateList from "../date-list/date-list";

Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}

export default function EditableDateTable(props) {
    const [dates, setDates] = useState(props.dates);

    const [isOpen, setOpen] = useState(false);
    const openModal = () => {
        setOpen(true);
    }
    const closeModal = () => setOpen(false);

    const updateDates = (newDates) => {
        setDates(newDates);
        props.onChange(newDates);
    }

    useEffect(() => {
        setDates(props.dates)
    }, [props.dates]);

    return (
        <div>
            {dates && dates.length > 0 && <DateList
                dates={dates}
                onChange={dates => updateDates(dates)}
                onDelete={(i) => {
                    updateDates(dates.filter((d, index) => i !== index));
                }}
            />}
        </div>);
}
