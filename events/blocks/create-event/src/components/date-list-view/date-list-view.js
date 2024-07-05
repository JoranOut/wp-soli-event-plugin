import './date-list-view.scss';
import {useState, useEffect, useRef} from '@wordpress/element';
import DateListViewItem from "./date-list-view-item";
import editIcon from '../../../../../../inc/assets/img/icons/edit.svg';
import {Button} from "@mui/material";
import dayjs from "dayjs";

export default function DateListView(props) {
    const [dates, setDates] = useState(props.dates);
    const dateListItems = useRef(null);
    const scrollIndicator = useRef(null);

    const scrollToToday = () => {
        const pastDates = Array.from(document.querySelectorAll(".date-list-view-item.past"));
        const scrollTop = pastDates?.map((date) => date.clientHeight).reduce((a,b,) => a + b, 0);
        dateListItems.current.scrollTop = scrollTop ?? 0;
    }

    const editModal = () => {
        props.onEdit();
    }

    let today = dayjs().format("YYYY-MM-DD HH::mm::ss");

    useEffect(() => {
        setDates(props.dates);
        today = dayjs().format("YYYY-MM-DD HH::mm::ss");
        scrollToToday();
    }, [props]);

    const isScrollable = () => {
        const elem = scrollIndicator?.current;
        return elem?.scrollHeight > elem?.clientHeight;
    };

    return (
        <div className="date-list-view">
            <h3>Datums</h3>
            <img
                className={"edit-icon"}
                src={editIcon}
                onClick={editModal}
            />
            <div className={isScrollable() ? "scroll-indicator" : ""} ref={scrollIndicator}>
                <div className="date-list-items" ref={dateListItems}>
                    {!!dates && dates.sort((a, b) => a.startDate < b.startDate ? -1 : 1).map((date, i) => {
                        return (
                            <DateListViewItem
                                key={i}
                                date={date}
                            />
                        );
                    })}
                </div>
            </div>
            {dates && dates.length > 6 && <Button className='expand-button'
                                                  onClick={() => scrollToToday()}>vandaag
            </Button>}
        </div>)
}

