import "./daterange-picker.scss"
import {useState, useEffect, useRef} from '@wordpress/element';
import {DateTimePicker} from '@mui/x-date-pickers/DateTimePicker';
import {DatePicker} from '@mui/x-date-pickers/DatePicker';
import {TimePicker} from '@mui/x-date-pickers/TimePicker';
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import 'dayjs/locale/nl';
import customParseFormat from "dayjs/plugin/customParseFormat";
import {renderTimeViewClock} from '@mui/x-date-pickers/timeViewRenderers';

function DateRangePicker(props) {
    const [id, setId] = useState(props.date ? props.date.id : null)
    const [startDate, setStartDate] = useState(dayjs(props.date ? props.date.startDate : getDefaultDate()))
    const [endDate, setEndDate] = useState(dayjs(props.date ? props.date.endDate : getDefaultDate(1)))
    const [style, setStyle] = useState(props.style ? props.style : "grid")

    const [validStartDate, setValidStartDate] = useState(true);
    const [validEndDate, setValidEndDate] = useState(true);

    dayjs.locale("nl");
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

    const resizeInput = (ref) => {
        if (ref.current) {
            const input = ref.current.querySelector('input');
            input.style.width = input.value?.length + "ch";
        }
    }

    const isDateInValid = (date) => {
        return isNaN(date.year());
    }

    useEffect(() => {
        setId(props.date ? props.date.id : null)
        setStartDate(dayjs(props.date ? props.date.startDate : getDefaultDate()))
        setEndDate(dayjs(props.date ? props.date.endDate : getDefaultDate(1)))
    }, [props.date])

    useEffect(() => {
        resizeInput(dateInput1);
    }, [startDate, props.date])

    useEffect(() => {
        resizeInput(dateInput2);
    }, [endDate, props.date])

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
                                  dateInput1.current.querySelector('input').focus()
                              }}
                        >{startDate.locale("nl").format("dddd")}</span>
                        <DatePicker
                            ref={dateInput1}
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
                            format=" D MMMM, YYYY"
                        />
                    </div>
                    <TimePicker
                        className="start-time time"
                        value={startDate}
                        onChange={(newStartDate) => {
                            setStartDate(newStartDate);
                            updateDate(newStartDate, endDate);
                        }}

                        ampm={false}
                        viewRenderers={{
                            hours: renderTimeViewClock,
                            minutes: renderTimeViewClock
                        }}
                    />
                    <div className="tot">tot</div>
                    {isSingleDay() && <DateTimePicker
                        className="end-time time"
                        value={endDate}
                        onChange={(newEndDate) => {
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
                                          dateInput2.current.querySelector('input').focus()
                                      }}
                                >{endDate.locale("nl").format("dddd")}</span>
                                <DateTimePicker
                                    value={endDate}
                                    ref={dateInput2}
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

                                    format=" D MMMM, YYYY"
                                    ampm={false}
                                    viewRenderers={{
                                        hours: renderTimeViewClock,
                                        minutes: renderTimeViewClock
                                    }}
                                />
                            </div>
                            <TimePicker
                                className="end-time time"
                                value={endDate}
                                onChange={(newEndDate) => {
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
