import "./index.scss"
import {useState} from '@wordpress/element';
import RepeatingDate from "./components/repeating-date/repeating-date";
import EventsProvider from "./components/events-provider/events-provider";
import DateRangePicker from "./components/daterange-picker/daterange-picker";
import LocationPicker from "./components/location-picker/location-picker";

wp.blocks.registerBlockType("soli/create-event", {
    title: "Create Event",
    icon: "smiley",
    category: "soli",
    attributes: {
        skyColor: {type: "string"}, grassColor: {type: "string"}
    },
    edit: EditComponent,
    save: function (props) {
        return null
    },
    usesContext: ['postId']

})

function EditComponent(props) {
    const {postId} = props.context;
    const [dates, setDates] = useState();

    const updateMainDate = (date) => {
        setDates({...dates, main: date});
    }

    const updateLocation = (rooms, location) => {
        dates.main.rooms = rooms;
        dates.main.location = location;
        setDates({...dates, main: dates.main})
    }

    return (<div className="soli-block-create-event">
        <EventsProvider
            post_id={postId}
            dates={dates}
            setDates={(newDates) => {
                setDates(newDates);
            }}
            enableSaveButton={true}
        >
            <DateRangePicker
                date={dates ? dates.main : null}
                minimalDate={new Date()}
                updateDate={updateMainDate}
            />
            <LocationPicker
                location={dates && dates.main ? dates.main.location : null}
                rooms={dates && dates.main ? dates.main.rooms : null}
                onChange={updateLocation}
            />
            <RepeatingDate
                dates={dates}
                setRepeatedDates={rdates => setDates({...dates, repeated: rdates})}
                setIsRepeatedDate={isrDates => setDates({...dates, isRepeatedDate: isrDates})}
            />
        </EventsProvider>
    </div>)
}

