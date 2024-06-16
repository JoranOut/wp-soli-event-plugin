import './repeating-date.scss';

import {useState, useEffect} from '@wordpress/element';
import {ToggleControl, Modal, Button} from "@wordpress/components"
import DateList from "../date-list/date-list";
import TimeGeneratorModalButton from "../time-generator-modal-button/time-generator-modal-button";
import undoSVG from "../../../../../../inc/assets/img/icons/undo arrow-1.svg";
import resetSVG from "../../../../../../inc/assets/img/icons/refresh.svg";
import DateListView from "../date-list-view/date-list-view";

Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}

export default function RepeatingDate(props) {
    const [isRepeating, setRepeating] = useState(props.dates ? props.dates.isRepeatedDate : false);
    const [dates, setDates] = useState(props.dates ? props.dates.repeated : null);
    const [startDate, setStartDate] = useState(props.dates && props.dates.main ? props.dates.main : null);
    const [history, setHistory] = useState([]);

    const [isOpen, setOpen] = useState(false);
    const openModal = () => {
        setOpen(true);
    }
    const closeModal = () => setOpen(false);

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
        setHistory(value => [...history, dates])
        console.log([...history, dates])
        props.setRepeatedDates(newDates);
    }

    const defaultDate = () => {
        return {
            startDate: new Date(),
            endDate: new Date().addHours(1)
        }
    }

    const addRepeatingDate = () => {
        const cleanCopy = {
            ...defaultDate(),
            location: props.dates.main.location,
            rooms: props.dates.main.rooms
        }
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

        {isRepeating &&
            <DateListView
                dates={props.dates}
                onEdit={() => openModal()}
            />
        }

        {isOpen && (
            <Modal
                title="Bewerk datums"
                size={"fill"}
                onRequestClose={closeModal}
                focusOnMount={true}
                isDismissible={true}
                shouldCloseOnEsc={true}
                shouldCloseOnClickOutside={true}
                __experimentalHideHeader={false}
            >
                {history.length > 0 &&
                    <>
                        <Button className='undo-button' title='undo' onClick={undo}><img src={undoSVG}/></Button>
                        <Button className='reset-button' title='reset' onClick={reset}><img src={resetSVG}/></Button>
                    </>}
                {dates && dates.length > 0 && <DateList
                    dates={dates}
                    minimalDate={startDate}
                    onChange={dates => updateDates(dates)}
                    onDelete={(i) => {
                        updateDates(dates.filter((d, index) => i !== index));
                    }}
                />}
                {isRepeating && (
                    <div className="repeat-options">
                        <Button variant="secondary" onClick={() => addRepeatingDate()}>
                            Voeg een datum toe
                        </Button>
                        <p> of </p>
                        <TimeGeneratorModalButton
                            date={props.dates.main}
                            onSubmit={(dates) => {
                                const repeatedDates = props.dates.repeated ?? [];
                                updateDates([
                                    ...repeatedDates,
                                    ...dates.map(date => {
                                        return {
                                            startDate: date.startDate,
                                            endDate: date.endDate,
                                            location: props.dates.main.location,
                                            rooms: props.dates.main.rooms
                                        };
                                    })
                                ])
                            }
                            }
                        />
                    </div>
                )}
            </Modal>
        )}
    </div>);
}
