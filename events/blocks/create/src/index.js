import "./index.scss"
import {ToggleControl, Button} from "@wordpress/components"
import {useState} from '@wordpress/element';
import DatePickerButton from "./components/date-picker/date-picker-button";
import TimePickerButton from "./components/time-picker/time-picker-button";
import TimeGeneratorModalButton from "./components/time-generator-modal-button/time-generator-modal-button";
import DateList from "./components/date-list/date-list";

wp.blocks.registerBlockType("soli/create-event", {
    title: "Create Event", icon: "smiley", category: "soli", attributes: {
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
    const [isRepeating, setRepeating] = useState(true);
    const [dates, setDates] = useState([
        new Date('Fri Oct 14 2022 21:11:22'),
        new Date('Fri Oct 21 2022 21:11:22'),
        new Date('Fri Oct 28 2022 21:11:22'),
        new Date('Fri Nov 04 2022 21:11:22'),
        new Date('Fri Nov 11 2022 21:11:22'),
        new Date('Fri Nov 18 2022 21:11:22')
    ]);
    const [trash, setTrash] = useState([]);

    const undo = () => {
        const item = trash.pop();
        const datescp = [...dates];
        datescp.splice(item.index, 0, item.date);
        setDates(datescp);
        setTrash(trash);
    };

    const reset = () => {
        const datescp = [...dates];
        for (let i = trash.length - 1 ; i >= 0 ; i--) {
            const item = trash.pop();
            datescp.splice(item.index, 0, item.date);
        }
        setDates(datescp);
        setTrash(trash);
    };

    return (<div>
        <ToggleControl
            label="Herhaaldatum"
            checked={isRepeating}
            onChange={() => setRepeating((state) => !state)}
        />
        {isRepeating && dates.length > 0 && <DateList
            dates={dates}
            onDelete={(i) => {
                setTrash([...trash, {index: i, date: dates[i]}]);
                setDates(dates.filter((d,index) => i !== index));
            }}
            showUndoAndReset={trash.length > 0}
            onUndo={undo}
            onReset={reset}
        />}
        {isRepeating && (
            <div className="repeat-options">
                <Button>
                    Voeg een datum toe
                </Button>
                <p> - of - </p>
                <TimeGeneratorModalButton
                    startDate={props.startDate}
                    onSubmit={(dates) => setDates(dates)}
                />
            </div>
        )}
    </div>);
}
