import "./event-list-item.scss";

export default function EventListItem(props) {
    const isSameDay = (d1, d2) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    }

    const parseDate = (start, end) => {
        if (isSameDay(start, end)){
            return start.format("dddd D MMMM, YYYY HH:mm") + " - " + end.format("HH:mm")
        }
        return start.format("dddd D MMMM, YYYY HH:mm") + " + " + end.format("dddd D MMMM, YYYY HH:mm");
    }

    return (
        <>
            {props.event &&
                <div>
                    <img src={props.event.featuredImage}/>
                    <h2>{props.event.title}</h2>
                    <p>{parseDate(props.event.startDate, props.event.endDate)}</p>
                    <a href={props.event.guid}>visit</a>
                </div>
            }
        </>
    );
}
