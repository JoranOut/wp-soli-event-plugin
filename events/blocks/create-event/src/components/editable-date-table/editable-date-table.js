import './editable-date-table.scss';

import {useState, useEffect} from '@wordpress/element';
import {Modal, Button} from "@wordpress/components"
import DateList from "../date-list/date-list";
import DateListView from "../date-list-view/date-list-view";

Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}

export default function EditableDateTable(props) {
    const [dates, setDates] = useState(props.dates);

    const [isOpen, setOpen] = useState(false);
    const openModal = () => {
        setOpen(true);
    }
    const closeModal = () => setOpen(false);

    const updateDates = (newDates) => {
        setDates(newDates);
        props.onChange(newDates);
    }

    useEffect(() => {
        setDates(props.dates)
    }, [props.dates]);

    return (
        <div>
            <DateListView
                dates={props.dates}
                onEdit={() => openModal()}
            />

            {isOpen && (
                <Modal
                    title="Bewerk datums"
                    size={"fill"}
                    onRequestClose={closeModal}
                    focusOnMount={true}
                    isDismissible={true}
                    shouldCloseOnEsc={true}
                    shouldCloseOnClickOutside={true}
                    __experimentalHideHeader={false}
                >
                    {dates && dates.length > 0 && <DateList
                        dates={dates}
                        onChange={dates => updateDates(dates)}
                        onDelete={(i) => {
                            updateDates(dates.filter((d, index) => i !== index));
                        }}
                    />}
                    <Button variant="secondary" onClick={() => closeModal()}>Sluiten</Button>
                </Modal>
            )}
        </div>);
}
