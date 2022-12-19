import {useState, useEffect} from '@wordpress/element';
import {ToggleControl, Button} from "@wordpress/components"
import DateList from "../date-list/date-list";
import TimeGeneratorModalButton from "../time-generator-modal-button/time-generator-modal-button";
import undoSVG from "../../../../../../inc/assets/img/icons/undo arrow-1.svg";
import resetSVG from "../../../../../../inc/assets/img/icons/refresh.svg";

export default function RepeatingDate(props) {
    const [isRepeating, setRepeating] = useState(props.dates ? props.dates.isRepeatedDate : false);
    const [dates, setDates] = useState(props.dates ? props.dates.repeated : null);
    const [startDate, setStartDate] = useState(props.dates && props.dates.main ? props.dates.main : null);
    const [history, setHistory] = useState([]);

    const undo = () => {
        setHistory(history.filter((snapshot, i) => i !== (history.length - 1)));
        const snapshot = history.pop();
        props.setRepeatedDates(snapshot);
    };

    const reset = () => {
        setHistory([]);
        props.setRepeatedDates(history[0]);
    };

    const updateDates = (newDates) => {
        setHistory([...history, dates])
        props.setRepeatedDates(newDates);
    }

    const addRepeatingDate = () => {
        const cleanCopy = {date: props.dates.main.date}
        updateDates(dates ? [...dates, cleanCopy]
            : [cleanCopy])
    }

    useEffect(() => {
        setDates(props.dates ? props.dates.repeated : null)
        setStartDate(props.dates && props.dates.main ? props.dates.main : null)
        setRepeating(props.dates ? props.dates.isRepeatedDate : false);
    }, [props]);

    return (<div>
        <ToggleControl
            label="Herhaaldatum"
            checked={isRepeating}
            onChange={() => {
                props.setIsRepeatedDate(!isRepeating);
            }}
        />

        {history.length > 0 &&
            <>
                <Button className='undo-button' title='undo' onClick={undo}><img src={undoSVG}/></Button>
                <Button className='reset-button' title='reset' onClick={reset}><img src={resetSVG}/></Button>
            </>}
        {isRepeating && dates && dates.length > 0 && <DateList
            dates={dates}
            minimalDate={startDate}
            onDelete={(i) => {
                updateDates(dates.filter((d, index) => i !== index));
            }}
        />}
        {isRepeating && (
            <div className="repeat-options">
                <Button onClick={addRepeatingDate}>
                    Voeg een datum toe
                </Button>
                <p> - of - </p>
                <TimeGeneratorModalButton
                    startDate={startDate}
                    onSubmit={(dates) => {
                        updateDates(dates.map(date => {
                            return {
                                date
                            };
                        }))
                    }
                    }
                />
            </div>
        )}
    </div>);
}
