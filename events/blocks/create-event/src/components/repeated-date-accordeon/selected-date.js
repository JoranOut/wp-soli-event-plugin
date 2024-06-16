import './selected-date.scss';

function SelectedDate(props) {
    const date = props.date;

    return (
        <div className='selected-date'>
            <h4>Informatie:</h4>
            <p>{date.startDate}</p>
            <p>{date.endDate}</p>
        </div>
    );
}

export default SelectedDate;
