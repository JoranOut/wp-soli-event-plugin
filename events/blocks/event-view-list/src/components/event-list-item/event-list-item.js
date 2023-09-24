import "./event-list-item.scss";

export default function EventListItem(props) {
    const parseDate = (start, end) => {
        const startDate = start.getFullYear() + "." + ensureTwoDigits(start.getMonth()) + "." + ensureTwoDigits(start.getDate());
        const startTime = ensureTwoDigits(start.getHours()) + ":" + ensureTwoDigits(start.getMinutes());
        const endDate = end.getFullYear() + "." + ensureTwoDigits(end.getMonth()) + "." + ensureTwoDigits(end.getDate());
        const endTime = ensureTwoDigits(end.getHours()) + ":" + ensureTwoDigits(end.getMinutes());
        if (startDate === endDate) {
            return startDate + " " + startTime + " - " + endTime;
        }
        return startDate + " " + startTime + " - " + endDate + " " + endTime;
    }

    const ensureTwoDigits = (digits) => {
        return ("00" + digits).slice(-2);
    }

    return (
        <>
            {props.event &&
                <div>
                    <img src={props.event.featuredImage}/>
                    <h2>{props.event.title}</h2>
                    <p>{parseDate(props.event.start, props.event.end)}</p>
                    <a href={props.event.guid}>visit</a>
                </div>
            }
        </>
    );
}
