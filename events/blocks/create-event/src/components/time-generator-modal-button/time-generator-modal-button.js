import "./time-generator-modal-button.scss"
import {SelectControl, Modal, Button} from "@wordpress/components"
import {useState, useEffect} from '@wordpress/element';
import DatePickerButton from "../date-picker/date-picker-button";
import {RepeatingOptions} from "./repeating-options";
import {generateBiWeekly, generateMonths, generateWeeks} from "./time-generator-helpers";

function RepeatStartDate(props) {
    return (
        <div className="repeat-end-date">
            <p>Herhalen vanaf: </p>
            <DatePickerButton
                date={props.currentDate}
                setDate={props.setDate}
            />
        </div>);
}

function RepeatEndDate(props) {
    return (
        <div className="repeat-end-date">
            <p>Herhalen tot en met: </p>
            <DatePickerButton
                currentDate={props.currentDate}
                minimalDate={props.minimalDate}
                setDate={props.setDate}
            />
        </div>);
}

function DateViewToggle(props) {
    const [isOpen, setOpen] = useState(false);

    const toggleOpen = () => {
        setOpen(!isOpen);
    }

    return (
        <div>
            <h3>Gegenereede Data:</h3>
            <div className={['example-data', isOpen ? 'full' : ''].join(' ')}>
                {props.data.map(data => {
                    return (
                        <div key={data}>
                            {data.toLocaleString("nl-NL", {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </div>
                    );
                })}
            </div>
            {
                props.data.length > 15 &&
                <Button className='expand-button'
                        onClick={() => toggleOpen()}>
                    {!isOpen ? 'Bekijk alle data' : 'Verberg'}
                </Button>
            }
        </div>
    )
}

function TimeGeneratorModalButton(props) {
    const [startDate, setStartDate] = useState(props.startDate ? props.startDate.date : new Date());
    const [method, setMethod] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [generatedData, setGeneratedData] = useState([]);
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

    useEffect(() => {
        setStartDate(props.startDate ? props.startDate.date : new Date())
    }, [props]);

    const generateData = (startDate, method, endDate) => {
        if (!startDate || !method || !endDate) {
            setError("Vul een methode en beide data in voor resultaat")
            setGeneratedData([])
            return;
        }
        if (startDate > endDate) {
            setError("Einddatum moet na start datum vallen")
            setGeneratedData([])
            return;
        }

        const dates = [];
        switch (method) {
            case RepeatingOptions.WEEKLY:
                dates.push(...generateWeeks(startDate, endDate));
                break;
            case RepeatingOptions.BIWEEKLY:
                dates.push(...generateBiWeekly(startDate, endDate));
                break;
            case RepeatingOptions.MONTHLY:
                dates.push(...generateMonths(startDate, endDate));
                break;
            default:
                break;
        }

        if (dates.length === 0){
            setError("Gebruik een grotere tijdspanne om datums te genereren. ")
            setGeneratedData([])
            return;
        }

        setError(null);
        setGeneratedData(dates);

    }

    return (
        <div className="generate-dates">
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
                    {<RepeatStartDate
                        currentDate={startDate}
                        setDate={(newDate) => {
                            setStartDate(newDate);
                            generateData(newDate, method, endDate);
                        }}
                    />}

                    <SelectControl
                        help='Selecteer hoe het evenement zich herhaalt'
                        label='Kies een methode'
                        value={method ?? ''}
                        onChange={(value) => {
                            setMethod(value);
                            generateData(startDate, value, endDate);
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

                    {!!method && <RepeatEndDate
                        currentDate={endDate}
                        minimalDate={props.startDate}
                        setDate={(newDate) => {
                            setEndDate(newDate);
                            generateData(startDate, method, newDate);
                        }}
                    />}

                    {!!error && <p>
                        {error}
                    </p>}

                    {generatedData.length > 0 && <DateViewToggle
                        data={generatedData}/>}

                    {generatedData.length > 0 && <Button
                        className="submit-button"
                        variant="secondary"
                        onClick={submit}>Gebruiken</Button>}
                </Modal>
            )}
        </div>);
}

export default TimeGeneratorModalButton
