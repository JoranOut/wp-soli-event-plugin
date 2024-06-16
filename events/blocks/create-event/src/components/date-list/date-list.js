import './date-list.scss';
import DateListItem from "./date-list-item";
import {useState, useEffect} from '@wordpress/element';

export default function DateList(props) {
    const [dates, setDates] = useState(props.dates);

    const updateDate = (date, index) => {
        const newDates = dates ? [...dates] : [];
        newDates[index] = date;
        setDates(newDates);
        props.onChange(newDates);
    }

    useEffect(() => {
        console.log(props.dates)
        setDates(props.dates)
    }, [props.dates])

    return (
        <div className="date-list">
            <h3>Andere datums</h3>
            {dates && dates.map((date, i) => {
                return (
                    <DateListItem
                        key={i}
                        date={date}
                        minimalDate={props.minimalDate}
                        updateDate={(date) => updateDate(date, i)}
                        onDelete={() => {
                            props.onDelete(i)
                        }}
                    />
                );
            })}
        </div>
    );
}

