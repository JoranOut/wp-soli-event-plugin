import "./daterange-picker.scss"
import { __ } from '@wordpress/i18n';
import {useState, useEffect, useRef} from '@wordpress/element';
import {DateTimePicker} from '@mui/x-date-pickers/DateTimePicker';
import {DatePicker} from '@mui/x-date-pickers/DatePicker';
import {TimePicker} from '@mui/x-date-pickers/TimePicker';
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {renderTimeViewClock} from '@mui/x-date-pickers/timeViewRenderers';

// MUI X 8+ keeps a half-typed field only while its `value` prop follows every
// onChange, invalid dates included. The range below ignores invalid dates, so
// each picker holds its own input value and resyncs when the range changes.
function BufferedPicker({picker: Picker, value, onChange, ...props}) {
    const [input, setInput] = useState(value);

    useEffect(() => {
        setInput(value);
    }, [value]);

    return <Picker
        {...props}
        value={input}
        onChange={(newValue, context) => {
            setInput(newValue);
            onChange(newValue, context);
        }}
    />;
}

function DateRangePicker(props) {
    const [id, setId] = useState(props.date ? props.date.id : null)
    const [startDate, setStartDate] = useState(dayjs(props.date ? props.date.startDate : getDefaultDate()))
    const [endDate, setEndDate] = useState(dayjs(props.date ? props.date.endDate : getDefaultDate(1)))
    const [style, setStyle] = useState(props.style ? props.style : "grid")

    const [validStartDate, setValidStartDate] = useState(true);
    const [validEndDate, setValidEndDate] = useState(true);

    dayjs.extend(customParseFormat);

    const dateInput1 = useRef();
    const dateInput2 = useRef();

    const updateDate = (newStartDate, newEndDate) => {
        props.updateDate({id: id, startDate: newStartDate.toDate(), endDate: newEndDate.toDate()})
    }

    const isSingleDay = () => {
        return startDate.date() === endDate.date() &&
            startDate.month() === endDate.month() &&
            startDate.year() === endDate.year();
    }

    const isDateInValid = (date) => {
        // MUI passes null when a field is cleared and an invalid dayjs while the
        // user is mid-typing; both must be treated as invalid without throwing.
        return !date || !date.isValid();
    }

    useEffect(() => {
        setId(props.date ? props.date.id : null)
        setStartDate(dayjs(props.date ? props.date.startDate : getDefaultDate()))
        setEndDate(dayjs(props.date ? props.date.endDate : getDefaultDate(1)))
    }, [props.date])

    return (
        <>
            <div className={["date-range-picker", isSingleDay() ? "single-day" : "multi-day", style].join(' ')}>
                <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale={'nl'}
                >
                    <div className={["start-date", validStartDate ? "" : "invalid"].join(" ")}>
                        <span className="weekday"
                              onClick={() => {
                                  dateInput1.current?.focus()
                              }}
                        >{startDate.locale("nl").format("dddd")}</span>
                        <BufferedPicker picker={DatePicker}
                            inputRef={dateInput1}
                            value={startDate}
                            onChange={(newStartDate) => {
                                if (isDateInValid(newStartDate)) {
                                    setValidStartDate(false);
                                    return;
                                }

                                let newEndDate = endDate;
                                if (isSingleDay()) {
                                    newEndDate = newEndDate
                                        .year(newStartDate.year())
                                        .month(newStartDate.month())
                                        .date(newStartDate.date());
                                }
                                setValidStartDate(true);
                                setStartDate(newStartDate);
                                setEndDate(newEndDate);
                                updateDate(newStartDate, newEndDate);
                            }}
                            format="D MMMM, YYYY"
                        />
                    </div>
                    <BufferedPicker picker={TimePicker}
                        className="start-time time"
                        value={startDate}
                        onChange={(newStartDate) => {
                            if (isDateInValid(newStartDate)) {
                                setValidStartDate(false);
                                return;
                            }
                            setValidStartDate(true);
                            setStartDate(newStartDate);
                            updateDate(newStartDate, endDate);
                        }}

                        ampm={false}
                        viewRenderers={{
                            hours: renderTimeViewClock,
                            minutes: renderTimeViewClock
                        }}
                    />
                    <div className="tot">{__('to', 'soli-event')}</div>
                    {isSingleDay() && <BufferedPicker picker={DateTimePicker}
                        className="end-time time"
                        value={endDate}
                        onChange={(newEndDate) => {
                            if (isDateInValid(newEndDate)) {
                                setValidEndDate(false);
                                return;
                            }
                            setValidEndDate(true);
                            setEndDate(newEndDate);
                            updateDate(startDate, newEndDate);
                        }}
                        minDateTime={startDate}

                        format="HH:mm"
                        ampm={false}
                        viewRenderers={{
                            hours: renderTimeViewClock,
                            minutes: renderTimeViewClock
                        }}
                    />}
                    {!isSingleDay() &&
                        <>
                            <div className={["end-date", validEndDate ? "" : "invalid"].join(" ")}>
                                <span className="weekday"
                                      onClick={() => {
                                          dateInput2.current?.focus()
                                      }}
                                >{endDate.locale("nl").format("dddd")}</span>
                                <BufferedPicker picker={DateTimePicker}
                                    value={endDate}
                                    inputRef={dateInput2}
                                    onChange={(newEndDate) => {
                                        if (isDateInValid(newEndDate)) {
                                            setValidEndDate(false);
                                            return;
                                        }

                                        newEndDate = newEndDate
                                            .hour(endDate.hour())
                                            .minute(endDate.minute());

                                        setValidEndDate(true);
                                        setEndDate(newEndDate);
                                        updateDate(startDate, newEndDate);
                                    }}
                                    minDateTime={startDate}

                                    format="D MMMM, YYYY"
                                    ampm={false}
                                    viewRenderers={{
                                        hours: renderTimeViewClock,
                                        minutes: renderTimeViewClock
                                    }}
                                />
                            </div>
                            <BufferedPicker picker={TimePicker}
                                className="end-time time"
                                value={endDate}
                                onChange={(newEndDate) => {
                                    if (isDateInValid(newEndDate)) {
                                        setValidEndDate(false);
                                        return;
                                    }
                                    setValidEndDate(true);
                                    setEndDate(newEndDate);
                                    updateDate(startDate, newEndDate);
                                }}

                                ampm={false}
                                viewRenderers={{
                                    hours: renderTimeViewClock,
                                    minutes: renderTimeViewClock
                                }}
                            />
                        </>
                    }
                </LocalizationProvider>
            </div>
        </>
    )
}

function addHours(date, hours) {
    if (hours) {
        date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
    }
    return date;
}

function getDefaultDate(h) {
    return addHours(new Date(), h).toISOString();
}

export default DateRangePicker;
