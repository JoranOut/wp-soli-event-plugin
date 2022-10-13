import "./index.scss"
import {DatePicker, TextControl, ToggleControl, SelectControl, Modal, Button} from "@wordpress/components"
import {useState} from '@wordpress/element';

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

function DatePickerButton(props) {
    const [modal, setModal] = useState(false);
    const [date, setDate] = useState(new Date());

    const minimalDate = (newDate) => {
        return props.minimalDate && newDate <= props.minimalDate;
    }

    const toggleModal = () => {
        setModal(!modal);
    };

    const setNewDate = (newDate) => {
        props.setDate(newDate);
        setDate(newDate);
        setModal(false);
    }

    return (<div className="date-picker-button">
        <Button onClick={() => toggleModal()}>
            {date.toLocaleString("nl-NL", {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}</Button>
        {modal && <DatePicker
            currentDate={date}
            onChange={(newDate) => setNewDate(new Date(newDate))}
            isInvalidDate={(newDate) => minimalDate(new Date(newDate))}
            onBlur={() => setModal(false)}
            __nextRemoveHelpButton
            __nextRemoveResetButton
        />}
    </div>)
}


function TimePickerButton(props) {
    const [time, setTime] = useState(props.time ?? addZeroIfSingleDigit(new Date()));
    const [edit, setEdit] = useState(false);

    const validateNumber = (newTime) => {
        return !isNaN(newTime.hours) && !isNaN(newTime.minutes);
    };

    const validateTime = (newTime) => {
        return 0 <= newTime.hours && newTime.hours < 24 && 0 <= newTime.minutes && newTime.minutes < 60;
    };

    const validateMinimalTime = (newTime) => {
        // TODO
        return true;
        // return !props.minimalTime
        //     && newTime.hours > props.minimalTime.hours
        //     && newTime.minutes > props.minimalTime.minutes;
    };

    const addZeroIfSingleDigit = () => {
        setTime({
            hours: ('00' + time.hours).slice(-2), minutes: ('00' + time.minutes).slice(-2)
        });
    };

    const setHours = (newHours) => {
        const newTime = {hours: newHours, minutes: time.minutes};
        if (validateNumber(newTime) && validateTime(newTime) && validateMinimalTime(newTime)) {
            setTime(newTime);
        }
    };

    const setMinutes = (newMinutes) => {
        const newTime = {hours: time.hours, minutes: newMinutes};
        if (validateNumber(newTime) && validateTime(newTime) && validateMinimalTime(newTime)) {
            setTime(newTime);
        }
    };

    const toggleEdit = () => {
        setEdit(!edit);
    };

    return (<div className="time-picker-button">
        {!edit && <Button onClick={(edit) => toggleEdit(edit)}>
            {time.hours}:{time.minutes}</Button>}
        {edit && <div className="components-time">
            <TextControl
                value={time.hours}
                onChange={(newHours) => setHours(newHours)}
                onBlur={() => addZeroIfSingleDigit()}
            />
            <p>:</p>
            <TextControl
                value={time.minutes}
                onChange={(newMinutes) => setMinutes(newMinutes)}
                onBlur={() => {
                    addZeroIfSingleDigit();
                    toggleEdit();
                }}
            />
            <DropdownButton
                setTime={(newTime) => setTime(newTime)}
                onBlur={() => toggleEdit()}
            />
        </div>}
    </div>)
}


function DropdownButton(props) {
    const [drop, setDrop] = useState(false);

    const validateMinimalTime = (newTime) => {
        // TODO
        return 0 <= newTime.hours && newTime.hours < 24 && 0 <= newTime.minutes && newTime.minutes < 60;
    };

    const addZeroIfSingleDigit = (time) => {
        return {
            hours: ('00' + time.hours).slice(-2), minutes: ('00' + time.minutes).slice(-2)
        };
    };

    const createDropdownTimes = () => {
        const times = [];
        for (let i = 0; i < 24; i++) {
            for (let j = 0; j < 60; j = j + 5) {
                times.push(addZeroIfSingleDigit({
                    hours: i, minutes: j,
                }));
            }
        }
        return times;
    };

    const setTime = (newTime) => {
        setDrop(false);
        props.setTime({
            hours: newTime.getAttribute('data-hours'), minutes: newTime.getAttribute('data-minutes'),
        });
        props.onBlur();
    };

    const toggleDrop = () => {
        setDrop(!drop);
    };

    return (<div className="dropdown">
        <Button
            className="triangle"
            onClick={() => toggleDrop()}
            onBlur={() => props.onBlur()}
        />
        {drop && <div className="content">
            {createDropdownTimes().map(time => {
                return (<Button
                    key={time.hours + time.minutes}
                    data-hours={time.hours}
                    data-minutes={time.minutes}
                    onClick={(newTime) => setTime(newTime.target)}>
                    {time.hours}:{time.minutes}
                </Button>);
            })}
        </div>}
    </div>)
}

const RepeatingOptions = {
    WEEKLY: 'WEEKLY', BIWEEKLY: 'BIWEEKLY', MONTHLY: 'MONTHLY', CUSTOM: 'CUSTOM'
};

function RepeatingDate(props) {
    const [open, setOpen] = useState(true);

    return (<div>
        <ToggleControl
            label="Herhaaldatum"
            checked={open}
            onChange={() => setOpen((state) => !state)}
        />
        {open && (
            <div className="repeat-options">
                <Button>
                    Voeg een datum toe
                </Button>
                <p> - of - </p>
                <GenerateDates
                    startDate={props.startDate}
                />
            </div>
        )}
    </div>);
}

function RepeatEndDate(props) {
    return (<div className="repeat-end-date">
        <p>Herhalen tot: </p>
        <DatePickerButton
            currentDate={props.currentDate}
            minimalDate={props.minimalDate}
            setDate={props.setDate}
        /></div>);
}

function GenerateDates(props) {
    const [method, setMethod] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [isOpen, setOpen] = useState(true);
    const openModal = () => setOpen(true);
    const closeModal = () => setOpen(false);

    const [generatedData, setGeneratedData] = useState([]);

    const generateData = (newEndDate) => {
        const gdata = [];
        console.log(props.startDate);
        console.log(newEndDate);
        for (let d = props.startDate; d < newEndDate; d = incrementByWeek(d)) {
            gdata.push({date: d, active: true});
        }
        setGeneratedData(gdata);
    }

    const incrementByWeek = (date) => {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate()+7)
        return newDate;
    }


    return (<div className="generate-dates">
        <Button variant="secondary" onClick={openModal}>
            genereer datums
        </Button>
        {isOpen && (
            <Modal
                title="Genereer datums"
                onRequestClose={closeModal}
                focusOnMount={true}
                isDismissible={true}
                shouldCloseOnEsc={true}
                shouldCloseOnClickOutside={true}
                __experimentalHideHeader={false}
            >
                <SelectControl
                    help='Selecteer hoe het evenement zich herhaalt'
                    label='Kies een methode'
                    value={method ?? ''}
                    onChange={(value) => setMethod(value)}
                    options={[{
                        disabled: true, label: 'Selecteer een optie', value: ''
                    }, {
                        label: 'Weekelijks', value: RepeatingOptions.WEEKLY
                    }, {
                        label: 'Om de week', value: RepeatingOptions.BIWEEKLY
                    }, {
                        label: 'Maandelijks', value: RepeatingOptions.MONTHLY
                    }]}
                />

                {method && <RepeatEndDate
                    currentDate={endDate}
                    minimalDate={props.startDate}
                    setDate={(newDate) => {
                        setEndDate(newDate);
                        generateData(newDate)
                    }}
                />}

                {generatedData.map(data => {
                    return (
                        <DateViewToggle
                            key={data.date}
                            data={data}
                            setActive={(active) => data.active = active}
                        />
                    )
                })}
                <Button
                    variant="secondary"
                    onClick={closeModal}>Gebruiken</Button>
            </Modal>
        )}
    </div>);
}

function DateViewToggle(props) {
    const [active, setActive] = useState(true);

    const toggleActive = () => {
        props.setActive(!active);
        setActive(!active);
    }

    return (
        <div
            className={[setActive ? 'active' : '', 'data-view-toggle'].join(' ')}
                onClick={()=>toggleActive()}>
            {props.data.date.toLocaleString("nl-NL", {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
        </div>
    )
}


