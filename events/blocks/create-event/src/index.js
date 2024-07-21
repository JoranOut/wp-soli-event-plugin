import "./index.scss"
import {useState} from '@wordpress/element';
import EditableDateTable from "./components/editable-date-table/editable-date-table";
import EventsProvider from "./components/events-provider/events-provider";
import DateRangePicker from "./components/daterange-picker/daterange-picker";
import LocationPicker from "./components/location-picker/location-picker";
import TimeGeneratorModalButton from "./components/time-generator-modal-button/time-generator-modal-button";
import CopyButton from "./components/copy-button/copy-button";

wp.blocks.registerBlockType("soli/create-event", {
    title: "Create Event",
    icon: "smiley",
    category: "soli",
    edit: EditComponent,
    save: function (props) {
        return null
    },
    usesContext: ['postId']

})

function EditComponent(props) {
    const {postId} = props.context;
    const [dates, setDates] = useState();

    const updateSingleDate = (date) => {
        if (dates?.length > 0){
            const singleDate = dates[0];
            setDates([{...singleDate, ...date}]);
        }
    }

    const updateSingleLocation = (rooms, location) => {
        const singleDate = dates[0];
        setDates([{...singleDate, rooms: rooms, location: location}])
    }

    const addGeneratedDates = (genDates) => {
        const newDates = dates ? [...dates] : [];
        newDates.push(...genDates);
        setDates(newDates);
    }

    const copySingleDate = () => {
        if (dates?.length > 0) {
            const {id: _, ...cleanCopy} = dates[0];
            setDates([...dates, cleanCopy]);
        }
    }

    const updateRepeatingDates = (newDates) => {
        setDates(newDates)
    }

    return (<div className="soli-block-create-event">
        <EventsProvider
            post_id={postId}
            dates={dates}
            setDates={(newDates) => {
                if (newDates?.length > 0){
                    setDates(newDates);
                } else {
                    setDates([{
                        startDate: getDefaultDate(),
                        endDate: getDefaultDate(1)
                    }]);
                }
            }}
            enableSaveButton={true}
        >
            {
                (!dates || dates.length < 2) &&
                <div className="single-event">
                    <DateRangePicker
                        date={dates?.length > 0 ? dates[0] : null}
                        minimalDate={new Date()}
                        updateDate={(date) => updateSingleDate(date)}
                        defaultDate={true}
                    />
                    <LocationPicker
                        location={dates?.length > 0 ? dates[0].location : null}
                        rooms={dates?.length > 0 ? dates[0].rooms : null}
                        onChange={(rooms, location) => updateSingleLocation(rooms, location)}
                    />
                    <TimeGeneratorModalButton
                        date={dates?.length > 0 ? dates[0] : null}
                        onSubmit={(genDates) => {
                            addGeneratedDates(genDates)
                        }}/>
                    <CopyButton onClick={() => copySingleDate()}/>
                </div>
            }
            {
                dates && dates.length > 1 &&
                <EditableDateTable
                    dates={dates}
                    onChange={newDates => {
                        updateRepeatingDates(newDates)
                    }}
                />
            }
        </EventsProvider>
    </div>)
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

