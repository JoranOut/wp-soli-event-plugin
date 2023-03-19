import "./index.scss"
import {useState} from '@wordpress/element';
import RepeatingDate from "./components/repeating-date/repeating-date";
import EventsProvider from "./components/events-provider/events-provider";
import DateTimePicker from "./components/datetime-picker/datetime-picker";

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

    return (<div className="soli-block-create-event">
        <EventsProvider
            post_id={postId}
            dates={dates}
            setDates={(newDates) => {
                setDates(newDates);
            }}
            enableSaveButton={true}
        >
            {
                <>
                    <DateTimePicker
                        date={dates ? dates.main : null}
                        minimalDate={new Date()}
                        updateDate={updateMainDate}
                    />
                    <RepeatingDate
                        dates={dates}
                        setRepeatedDates={rdates => setDates({...dates, repeated: rdates})}
                        setIsRepeatedDate={isrDates => setDates({...dates, isRepeatedDate: isrDates})}
                    />
                </>
            }
        </EventsProvider>
    </div>)
}

