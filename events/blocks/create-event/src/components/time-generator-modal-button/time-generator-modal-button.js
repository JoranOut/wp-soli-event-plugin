import "./time-generator-modal-button.scss"
import {SelectControl, Modal, Button} from "@wordpress/components"
import {useState, useEffect} from '@wordpress/element';
import repeatSVG from "../../../../../../inc/assets/img/icons/repeat.svg";

import {RepeatingOptions} from "./repeating-options";

import {
    generateBiWeeklyTimes,
    generateBiWeeklyUntil,
    generateMonthsTimes,
    generateMonthsUntil,
    generateWeeksTimes,
    generateWeeksUntil
} from "./time-generator-helpers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {DatePicker} from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import 'dayjs/locale/nl';

import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Switch from '@mui/material/Switch';
import {RepeatingMethod} from "./repeating-method";
import NumberedInput from "./numbered-input";
import DateRangePicker from "../daterange-picker/daterange-picker";
import LocationPicker from "../location-picker/location-picker";
import EventStatusSelector from "../event-status-selector/event-status-selector";

function DateViewToggle(props) {
    const [isOpen, setOpen] = useState(false);

    dayjs.locale("nl");

    const toggleOpen = () => {
        setOpen(!isOpen);
    }

    const dateOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
    };

    return (
        <div className="generated-data">
            <h3>Gegenereerde data:</h3>
            <div className={['example-data', isOpen ? 'full' : ''].join(' ')}>
                {props.data.map(data => {
                    return (<div key={data.startDate.toISOString()}>
                        {data.startDate.toLocaleString("nl-NL", dateOptions)}
                        <span>  -  </span>
                        {data.endDate.toLocaleString("nl-NL", dateOptions)}
                    </div>);
                })}
            </div>
            {props.data.length > 6 && <Button className='expand-button'
                                              onClick={() => toggleOpen()}>
                {!isOpen ? 'Bekijk alle data' : 'Verberg'}
            </Button>}
        </div>)
}

function RadioRepeatingMethod(props) {
    const [repeatingMethod, setMethod] = useState(RepeatingMethod.UNTIL_DATE);

    const updateMethod = (newMethod) => {
        props.onChange(newMethod);
    }

    return (<FormControl>
        <RadioGroup
            row
            name="method"
            defaultValue={repeatingMethod}
            onChange={(event, newMethod) => {
                updateMethod(newMethod);
            }}
        >
            <FormControlLabel
                value={RepeatingMethod.UNTIL_DATE}
                control={<Radio/>}
                label="Tot datum"
                labelPlacement="end"
            />
            <FormControlLabel
                value={RepeatingMethod.TIMES}
                control={<Radio/>}
                label="Aantal"
                labelPlacement="end"
            />
        </RadioGroup>
    </FormControl>);
}

function TimeGeneratorModalButton(props) {
    const [startDate, setStartDate] = useState(props.date ? dayjs(props.date.startDate) : dayjs());
    const [endDate, setEndDate] = useState(props.date ? dayjs(props.date.endDate) : dayjs());
    const [location, setLocation] = useState(props.date ? props.date.location : null);
    const [rooms, setRooms] = useState(props.date ? props.date.rooms : []);
    const [status, setStatus] = useState(props.date ? props.date.status : []);
    const [notes, setNotes] = useState(props.date ? props.date.notes : []);
    const [useNotes, setUseNotes] = useState(false);
    const [frequency, setFrequency] = useState(null);
    const [repeatAmount, setRepeatAmount] = useState(0);
    const [endRepeatDate, setEndRepeatDate] = useState(null);
    const [generatedData, setGeneratedData] = useState([]);
    const [method, setMethod] = useState(RepeatingMethod.UNTIL_DATE);
    const [error, setError] = useState(null);

    const [isOpen, setOpen] = useState(false);
    const openModal = () => {
        setOpen(true);
    }
    const closeModal = () => setOpen(false);
    const submit = () => {
        props.onSubmit(generatedData);
        setOpen(false);
    }

    const updateLocation = (rooms, location) => {
        setLocation(location);
        setRooms(rooms);
    }

    useEffect(() => {
        setStartDate(props.date ? dayjs(props.date.startDate) : dayjs())
        setEndDate(props.date ? dayjs(props.date.endDate) : dayjs())
        setLocation(props.date ? props.date.location : null);
        setRooms(props.date ? props.date.rooms : []);
        setStatus(props.date ? props.date.status : []);
        setNotes(props.date ? props.date.notes : []);
    }, [props]);

    const generateData = ({
                              startDate,
                              endDate,
                              frequency,
                              method,
                              endRepeatDate,
                              repeatAmount,
                              rooms,
                              location,
                              status,
                              useNotes
                          }) => {
        setGeneratedData([])

        console.log({startDate});
        console.log({endDate});
        console.log({frequency});
        console.log({method});
        console.log({endRepeatDate});
        console.log({repeatAmount});
        console.log({rooms});
        console.log({location});
        console.log({status});
        console.log({useNotes});

        if (!startDate || !frequency || !method || (!endRepeatDate && !repeatAmount)) {
            setError("Vul een frequency, methode en data in voor resultaat")
            return;
        }
        if (!!endRepeatDate && startDate > endRepeatDate) {
            setError("Einddatum moet na start datum vallen")
            return;
        }

        setError(null);

        const endRepeatDateNextDay = endRepeatDate?.add(1, 'day');

        const dates = [];
        if (method === RepeatingMethod.UNTIL_DATE) {
            switch (frequency) {
                case RepeatingOptions.WEEKLY:
                    dates.push(...generateWeeksUntil(startDate, endDate, endRepeatDateNextDay));
                    break;
                case RepeatingOptions.BIWEEKLY:
                    dates.push(...generateBiWeeklyUntil(startDate, endDate, endRepeatDateNextDay));
                    break;
                case RepeatingOptions.MONTHLY:
                    dates.push(...generateMonthsUntil(startDate, endDate, endRepeatDateNextDay));
                    break;
                default:
                    break;
            }
        } else {
            switch (frequency) {
                case RepeatingOptions.WEEKLY:
                    dates.push(...generateWeeksTimes(startDate, endDate, endRepeatDateNextDay, repeatAmount));
                    break;
                case RepeatingOptions.BIWEEKLY:
                    dates.push(...generateBiWeeklyTimes(startDate, endDate, endRepeatDateNextDay, repeatAmount));
                    break;
                case RepeatingOptions.MONTHLY:
                    dates.push(...generateMonthsTimes(startDate, endDate, endRepeatDateNextDay, repeatAmount));
                    break;
                default:
                    break;
            }
        }

        if (dates.length === 0) {
            setError("Gebruik een grotere tijdspanne om datums te genereren. ")
            setGeneratedData([])
            return;
        }

        dates.map(date => {
            date.rooms = rooms;
            date.location = location;
            date.status = status;
        })

        if (useNotes) {
            dates.map(date => {
                date.notes = notes;
            })
        }

        setError(null);
        setGeneratedData(dates);

    }

    return (<div>
        <Button className="repeat-button" variant="secondary" onClick={openModal}>
            <img src={repeatSVG}/>
        </Button>
        {isOpen && (<Modal
            className="generate-dates"
            title="Genereer datums"
            onRequestClose={closeModal}
            size={"large"}
            focusOnMount={true}
            isDismissible={true}
            shouldCloseOnEsc={true}
            shouldCloseOnClickOutside={true}
            __experimentalHideHeader={false}
        >
            <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={'nl'}
            >
                <div className={"generate-grid"}>
                    <div className={"grid-top-left"}>
                        <DateRangePicker
                            className={"dateformat"}
                            minimalDate={props.minimalDate}
                            date={{startDate: startDate, endDate: endDate}}
                            updateDate={(date) => {
                                setStartDate(dayjs(date.startDate));
                                setEndDate(dayjs(date.endDate));
                                generateData({
                                    startDate: date.startDate,
                                    endDate: date.endDate,
                                    frequency: frequency,
                                    method: method,
                                    endRepeatDate: endRepeatDate,
                                    repeatAmount: repeatAmount,
                                    rooms: rooms,
                                    location: location,
                                    status: status,
                                    useNotes: useNotes,
                                });
                            }}
                            edit={true}
                        />
                        <LocationPicker
                            location={location}
                            rooms={rooms}
                            onChange={(rooms, location) => {
                                updateLocation(rooms, location);
                                generateData({
                                    startDate: startDate,
                                    endDate: endDate,
                                    frequency: frequency,
                                    method: method,
                                    endRepeatDate: endRepeatDate,
                                    repeatAmount: repeatAmount,
                                    rooms: rooms,
                                    location: location,
                                    status: status,
                                    useNotes: useNotes,
                                });
                            }}
                        />
                        <EventStatusSelector
                            status={status}
                            onChange={(status) => {
                                setStatus(status);
                                generateData({
                                    startDate: startDate,
                                    endDate: endDate,
                                    frequency: frequency,
                                    method: method,
                                    endRepeatDate: endRepeatDate,
                                    repeatAmount: repeatAmount,
                                    rooms: rooms,
                                    location: location,
                                    status: status,
                                    useNotes: useNotes,
                                });
                            }}
                        />
                        <FormControlLabel control={
                            <Switch
                                value={useNotes}
                                onChange={(useNotes) => {
                                    setNotes(useNotes);
                                    generateData({
                                        startDate: startDate,
                                        endDate: endDate,
                                        frequency: frequency,
                                        method: method,
                                        endRepeatDate: endRepeatDate,
                                        repeatAmount: repeatAmount,
                                        rooms: rooms,
                                        location: location,
                                        status: status,
                                        useNotes: useNotes,
                                    });
                                }}
                            />
                        } label="copy notes"/>

                    </div>
                    <div className={"grid-top-right"}>

                        <SelectControl
                            className={"frequentie"}
                            help='Selecteer hoe het evenement zich herhaalt'
                            label='Kies een herhaal frequentie'
                            value={frequency ?? ''}
                            onChange={(frequency) => {
                                setFrequency(frequency);
                                generateData({
                                    startDate: startDate,
                                    endDate: endDate,
                                    frequency: frequency,
                                    method: method,
                                    endRepeatDate: endRepeatDate,
                                    repeatAmount: repeatAmount,
                                    rooms: rooms,
                                    location: location,
                                    status: status,
                                    useNotes: useNotes,
                                });
                            }}
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

                        {!!frequency && <RadioRepeatingMethod
                            className={"method"}
                            onChange={(newMethod) => {
                                setMethod(newMethod);
                                generateData({
                                    startDate: startDate,
                                    endDate: endDate,
                                    frequency: frequency,
                                    method: newMethod,
                                    endRepeatDate: endRepeatDate,
                                    repeatAmount: repeatAmount,
                                    rooms: rooms,
                                    location: location,
                                    status: status,
                                    useNotes: useNotes,
                                });
                            }}
                        />}

                        {!!frequency && method === RepeatingMethod.TIMES && <>
                            <NumberedInput
                                className={"times"}
                                value={repeatAmount}
                                min={0}
                                onChange={(event, val) => {
                                    console.log(event)
                                    console.log(val)
                                    setRepeatAmount(val);
                                    generateData({
                                        startDate: startDate,
                                        endDate: endDate,
                                        frequency: frequency,
                                        method: RepeatingMethod.TIMES,
                                        endRepeatDate: null,
                                        amount: val,
                                        rooms: rooms,
                                        location: location,
                                        status: status,
                                        useNotes: useNotes,
                                    });
                                }}
                                endAdornment={{
                                    WEEKLY: 'weken', BIWEEKLY: 'keer om de week', MONTHLY: 'maanden'
                                }[frequency]}
                            />
                        </>}

                        {!!frequency && method === RepeatingMethod.UNTIL_DATE && <>
                            <p>Herhalen tot en met:</p>
                            <DatePicker
                                className="repeat-end-date"
                                value={endRepeatDate}
                                minDate={startDate}
                                onChange={(newEndRepeatDate) => {
                                    setEndRepeatDate(dayjs(newEndRepeatDate));
                                    generateData({
                                        startDate: startDate,
                                        endDate: endDate,
                                        frequency: frequency,
                                        method: method,
                                        endRepeatDate: newEndRepeatDate,
                                        repeatAmount: null,
                                        rooms: rooms,
                                        location: location,
                                        status: status,
                                        useNotes: useNotes,
                                    });
                                }}
                                format="dddd D MMMM, YYYY"
                            />
                        </>}

                        {!!error && <p>
                            {error}
                        </p>}
                    </div>

                    {generatedData.length > 0 && <DateViewToggle
                        data={generatedData}/>}

                    {generatedData.length > 0 && <Button
                        className="submit-button"
                        variant="secondary"
                        onClick={submit}>Gebruiken</Button>}
                </div>
            </LocalizationProvider>
        </Modal>)}
    </div>);
}

export default TimeGeneratorModalButton
