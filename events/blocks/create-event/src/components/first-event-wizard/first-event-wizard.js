import "./first-event-wizard.scss"
import SoliModal from "../../../../../inc/soli-modal";
import { __, sprintf } from '@wordpress/i18n';
import {useState, useMemo} from '@wordpress/element';
import {Button, SelectControl} from "@wordpress/components";
import dayjs from "dayjs";
import 'dayjs/locale/nl';
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {DatePicker} from "@mui/x-date-pickers/DatePicker";
import {TextField} from "@mui/material";
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';

import DateRangePicker from "../daterange-picker/daterange-picker";
import LocationPicker from "../location-picker/location-picker";
import EventStatusSelector from "../event-status-selector/event-status-selector";
import ConcertStatusSwitch from "../concert-status-switch/concert-status-switch";
import NumberedInput from "../time-generator-modal-button/numbered-input";
import {RepeatingOptions} from "../time-generator-modal-button/repeating-options";
import {RepeatingMethod} from "../time-generator-modal-button/repeating-method";
import {
    generateBiWeeklyTimes,
    generateBiWeeklyUntil,
    generateMonthsTimes,
    generateMonthsUntil,
    generateWeeksTimes,
    generateWeeksUntil,
} from "../time-generator-modal-button/time-generator-helpers";
import {useEventState, useEventActions} from "../events-context";
import {EVENT_STATUS} from "../../../../../inc/values";

const STEPS = 4;

// Guided setup for a brand-new event: shown once when the post is new and has
// no persisted dates yet. The wizard edits a local draft and only writes into
// the events context on Finish, so dismissing it (skip / esc / X) leaves the
// fabricated default date untouched - exactly the pre-wizard behaviour.
export default function FirstEventWizard(props) {
    // The provider INITs the context in an effect after mount; wait for it so
    // the wizard's draft state below captures the fabricated default date
    // instead of an empty event.
    const {isInitialized} = useEventState();
    if (!isInitialized) return null;
    return <FirstEventWizardInner {...props}/>;
}

function FirstEventWizardInner({onClose}) {
    const {events} = useEventState();
    const {updateEvent, addGeneratedEvents} = useEventActions();

    const initial = events[0] ?? {};
    const [step, setStep] = useState(0);

    const [startDate, setStartDate] = useState(initial.startDate ?? new Date());
    const [endDate, setEndDate] = useState(initial.endDate ?? new Date());
    const [location, setLocation] = useState(initial.location ?? null);
    const [rooms, setRooms] = useState(initial.rooms ?? []);
    const [status, setStatus] = useState(initial.status ?? EVENT_STATUS[0]);
    const [concertStatus, setConcertStatus] = useState(initial.concertStatus ?? false);
    const [notes, setNotes] = useState(initial.notes ?? null);

    const [frequency, setFrequency] = useState('');
    const [method, setMethod] = useState(RepeatingMethod.UNTIL_DATE);
    const [endRepeatDate, setEndRepeatDate] = useState(null);
    const [repeatAmount, setRepeatAmount] = useState(0);

    const generatedDates = useMemo(() => {
        if (!frequency) return [];
        const start = dayjs(startDate);
        const end = dayjs(endDate);

        if (method === RepeatingMethod.UNTIL_DATE) {
            if (!endRepeatDate || !endRepeatDate.isValid() || start > endRepeatDate) return [];
            const until = endRepeatDate.add(1, 'day');
            switch (frequency) {
                case RepeatingOptions.WEEKLY: return generateWeeksUntil(start, end, until);
                case RepeatingOptions.BIWEEKLY: return generateBiWeeklyUntil(start, end, until);
                case RepeatingOptions.MONTHLY: return generateMonthsUntil(start, end, until);
                default: return [];
            }
        }

        if (!repeatAmount) return [];
        switch (frequency) {
            case RepeatingOptions.WEEKLY: return generateWeeksTimes(start, end, null, repeatAmount);
            case RepeatingOptions.BIWEEKLY: return generateBiWeeklyTimes(start, end, null, repeatAmount);
            case RepeatingOptions.MONTHLY: return generateMonthsTimes(start, end, null, repeatAmount);
            default: return [];
        }
    }, [frequency, method, endRepeatDate, repeatAmount, startDate, endDate]);

    const finish = () => {
        updateEvent(0, {startDate, endDate, location, rooms, status, concertStatus, notes});
        // Repeats inherit everything except the notes, matching the repeat
        // generator's default (notes usually describe one specific date).
        addGeneratedEvents(generatedDates.map((date) => ({
            ...date, location, rooms, status, concertStatus,
        })));
        onClose();
    };

    const stepTitles = [
        __('When does it take place?', 'soli-event'),
        __('Where does it take place?', 'soli-event'),
        __('Details', 'soli-event'),
        __('Does it repeat?', 'soli-event'),
    ];

    const dateOptions = {
        weekday: 'long', month: 'long', day: 'numeric',
        year: 'numeric', hour: 'numeric', minute: 'numeric',
    };

    return (
        <SoliModal
            className="first-event-wizard"
            title={__('Plan your first date', 'soli-event')}
            onRequestClose={onClose}
            focusOnMount={true}
            isDismissible={true}
            shouldCloseOnEsc={true}
            shouldCloseOnClickOutside={false}
        >
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'nl'}>
                <div className="wizard-progress" role="list">
                    {stepTitles.map((title, i) => (
                        <span
                            key={title}
                            role="listitem"
                            aria-current={i === step ? 'step' : undefined}
                            className={['wizard-dot', i === step ? 'active' : '', i < step ? 'done' : ''].join(' ')}
                        />
                    ))}
                </div>

                <h3 className="wizard-step-title">{stepTitles[step]}</h3>

                {step === 0 && (
                    <div className="wizard-step">
                        <DateRangePicker
                            date={{startDate, endDate}}
                            updateDate={(date) => {
                                setStartDate(date.startDate);
                                setEndDate(date.endDate);
                            }}
                        />
                    </div>
                )}

                {step === 1 && (
                    <div className="wizard-step">
                        <LocationPicker
                            location={location}
                            rooms={rooms}
                            onChange={(newRooms, newLocation) => {
                                setRooms(newRooms);
                                setLocation(newLocation);
                            }}
                        />
                        <p className="wizard-hint">{__('You can leave this empty and pick a location later.', 'soli-event')}</p>
                    </div>
                )}

                {step === 2 && (
                    <div className="wizard-step wizard-details">
                        <EventStatusSelector
                            status={status}
                            onChange={setStatus}
                        />
                        <ConcertStatusSwitch
                            concertStatus={concertStatus}
                            onChange={setConcertStatus}
                        />
                        <TextField
                            className="wizard-notes"
                            label={__('Notes', 'soli-event')}
                            helperText={__('These notes will only be visible in the admin area.', 'soli-event')}
                            value={notes ?? ''}
                            multiline
                            minRows={2}
                            onChange={(event) => {
                                const value = event.target.value;
                                setNotes(value.length > 0 ? value : null);
                            }}
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="wizard-step wizard-repeat">
                        <SelectControl
                            className="wizard-frequency"
                            label={__('Choose a repeat frequency', 'soli-event')}
                            value={frequency}
                            onChange={setFrequency}
                            options={[
                                {label: __('Does not repeat', 'soli-event'), value: ''},
                                {label: __('Weekly', 'soli-event'), value: RepeatingOptions.WEEKLY},
                                {label: __('Every other week', 'soli-event'), value: RepeatingOptions.BIWEEKLY},
                                {label: __('Monthly', 'soli-event'), value: RepeatingOptions.MONTHLY},
                            ]}
                        />

                        {!!frequency && (
                            <FormControl>
                                <RadioGroup
                                    row
                                    name="wizard-repeat-method"
                                    value={method}
                                    onChange={(event, newMethod) => setMethod(newMethod)}
                                >
                                    <FormControlLabel
                                        value={RepeatingMethod.UNTIL_DATE}
                                        control={<Radio/>}
                                        label={__('Until date', 'soli-event')}
                                        labelPlacement="end"
                                    />
                                    <FormControlLabel
                                        value={RepeatingMethod.TIMES}
                                        control={<Radio/>}
                                        label={__('Number', 'soli-event')}
                                        labelPlacement="end"
                                    />
                                </RadioGroup>
                            </FormControl>
                        )}

                        {!!frequency && method === RepeatingMethod.UNTIL_DATE && (
                            <div className="wizard-repeat-until">
                                <p>{__('Repeat until and including:', 'soli-event')}</p>
                                <DatePicker
                                    className="repeat-end-date"
                                    value={endRepeatDate}
                                    minDate={dayjs(startDate)}
                                    onChange={(newDate) => setEndRepeatDate(dayjs(newDate))}
                                    format="dddd D MMMM, YYYY"
                                />
                            </div>
                        )}

                        {!!frequency && method === RepeatingMethod.TIMES && (
                            <NumberedInput
                                className="wizard-repeat-times"
                                value={repeatAmount}
                                min={0}
                                onChange={(event, val) => setRepeatAmount(val)}
                                endAdornment={{
                                    WEEKLY: __('weeks', 'soli-event'),
                                    BIWEEKLY: __('times every other week', 'soli-event'),
                                    MONTHLY: __('months', 'soli-event'),
                                }[frequency]}
                            />
                        )}

                        {generatedDates.length > 0 && (
                            <div className="wizard-generated">
                                <p>{sprintf(
                                    // translators: %d is the number of repeated dates that will be added.
                                    __('%d extra dates will be added:', 'soli-event'),
                                    generatedDates.length
                                )}</p>
                                <ul>
                                    {generatedDates.slice(0, 5).map((date) => (
                                        <li key={date.startDate.toISOString()}>
                                            {date.startDate.toLocaleString('nl-NL', dateOptions)}
                                        </li>
                                    ))}
                                    {generatedDates.length > 5 && <li>…</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="wizard-footer">
                    <Button variant="link" onClick={onClose}>
                        {__('Skip', 'soli-event')}
                    </Button>
                    <div className="wizard-nav">
                        {step > 0 && (
                            <Button variant="secondary" onClick={() => setStep(step - 1)}>
                                {__('Back', 'soli-event')}
                            </Button>
                        )}
                        {step < STEPS - 1 && (
                            <Button variant="primary" onClick={() => setStep(step + 1)}>
                                {__('Next', 'soli-event')}
                            </Button>
                        )}
                        {step === STEPS - 1 && (
                            <Button variant="primary" onClick={finish}>
                                {__('Finish', 'soli-event')}
                            </Button>
                        )}
                    </div>
                </div>
            </LocalizationProvider>
        </SoliModal>
    );
}
