import "./index.scss"
import {ToggleControl, SelectControl, Modal, Button} from "@wordpress/components"
import {useState} from '@wordpress/element';
import DatePickerButton from "./components/date-picker/date-picker-button";
import TimePickerButton from "./components/time-picker/time-picker-button";
import TimeGeneratorModalButton from "./components/time-generator-modal-button/time-generator-modal-button";

wp.blocks.registerBlockType("text/create-event", {
    title: "Create Event", icon: "smiley", category: "text", attributes: {
        skyColor: {type: "string"}, grassColor: {type: "string"}
    }, edit: EditComponent, save: function (props) {
        return null
    }
})

function EditComponent(props) {
    const [startDate, setStartDate] = useState(new Date());

    const startTime = {
        hours: new Date().getHours(), minutes: new Date().getMinutes()
    };

    const endTime = {
        hours: new Date().getHours() + 1, minutes: new Date().getMinutes()
    }

    return (<div className="soli-block-create-event">
        <div className="date-time-picker-line">
            <DatePickerButton
                currentDate={startDate}
                minimalDate={new Date()}
                setDate={(newDate) => setStartDate(newDate)}
            />
            <p> Van </p>
            <TimePickerButton
                time={startTime}
            /><p> tot </p>
            <TimePickerButton
                minimalTime={startTime}
                time={endTime}
            />
        </div>
        <RepeatingDate
            startDate={startDate}
        />
    </div>)
}

function RepeatingDate(props) {
    const [open, setOpen] = useState(true);
    const [dates, setDates] = useState([]);

    return (<div>
        <ToggleControl
            label="Herhaaldatum"
            checked={open}
            onChange={() => setOpen((state) => !state)}
        />
        <DateList dates={dates}/>
        {open && (
            <div className="repeat-options">
                <Button>
                    Voeg een datum toe
                </Button>
                <p> - of - </p>
                <TimeGeneratorModalButton
                    startDate={props.startDate}
                    onSubmit={(dates) => {
                        console.log(dates);
                        setDates(dates);
                    }}
                />
            </div>
        )}
    </div>);
}

function DateList(props) {
    return (
        <div>
            {props.dates.map(date => {
                return (
                    <DateListItem date={date}/>
                );
            })}
        </div>
    );
}

function DateListItem(props) {
    return (
        <div className='date-list-item'>
            {props.date.toLocaleString("nl-NL", {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
        </div>
    );
}
