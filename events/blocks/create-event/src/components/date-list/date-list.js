import './date-list.scss';
import DateListItem from "./date-list-item";
import {useState, useEffect} from '@wordpress/element';
import dayjs from "dayjs";
import StateStore from "../state-store/state-store";

export default function DateList(props) {
    const [dates, setDates] = useState(props.dates);
    const [state, setState] = useState();

    const updateDate = (date, index) => {
        const newDates = dates ? [...dates] : [];
        newDates[index] = date;
        setState(newDates);
        setDates(newDates);
        props.onChange(newDates);
    }

    const sortByStartDate = (a, b) => {
        return dayjs(a.startDate) < dayjs(b.startDate) ? -1 : 1;
    }

    const addGeneratedDates = (genDates) => {
        let newDates = dates ? [...dates] : [];
        newDates.push(...genDates);
        newDates = newDates.sort(sortByStartDate)
        setState(newDates);
        setDates(newDates);
        props.onChange(newDates);
    }

    const addDateCopy = (copy) => {
        let newDates = dates ? [...dates, copy] : [copy];
        newDates = newDates.sort(sortByStartDate)
        setState(newDates);
        setDates(newDates);
        props.onChange(newDates);
    }

    useEffect(() => {
        setState(props.dates);
        setDates(props.dates);
    }, [props.dates])

    return (
        <StateStore
            state={state}
            onChange={newDates => setDates(newDates)}
        >
            <div className="date-list">
                <h3>Alle datums</h3>
                {dates && dates.map((date, i) => {
                    return (
                        <DateListItem
                            key={i}
                            date={date}
                            updateDate={(date) => updateDate(date, i)}
                            addGeneratedDates={(genDates) => addGeneratedDates(genDates)}
                            addDateCopy={(copy) => addDateCopy(copy)}
                            onDelete={() => {
                                props.onDelete(i)
                            }}
                        />
                    );
                })}
            </div>
        </StateStore>
    );
}

