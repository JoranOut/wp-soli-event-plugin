import './date-list.scss';
import DateListItem from "./date-list-item";
import {useState, useEffect} from '@wordpress/element';

export default function DateList(props) {
    const [dates, setDates] = useState(props.dates);
    const updateDate = (date, index) => {
        dates[index] = date;
        setDates(dates);
    }

    useEffect(() => {
        setDates(props.dates)
    }, [props])

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

