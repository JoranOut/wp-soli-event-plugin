import './date-box.scss';
import dayjs from "dayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";


function DateBox({date}) {
    dayjs.locale("nl");
    const startDate = dayjs(date?.start);
    const endDate = dayjs(date?.end);

    const isSameDay = (d1, d2) => {
        return d1.date() === d2.date() &&
            d1.month() === d2.month() &&
            d1.year() === d2.year();
    }

    return (
        <div className="event-list-date-box">
            <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={'nl'}
            >
                <div className="date">
                    <h1>{startDate.format("DD")}</h1>
                    <h1>{startDate.format("MMM")}</h1>
                </div>
                {!isSameDay(startDate, endDate) &&
                    <div className="date">
                        <h1>{endDate.format("DD")}</h1>
                        <h1>{endDate.format("MMM")}</h1>
                    </div>}
            </LocalizationProvider>
        </div>);
}

export default DateBox;
