import "./month-navigation.scss";
import {useState, useEffect} from '@wordpress/element';
import {Button} from '@wordpress/components';

export default function MonthNavigation(props) {
    // Declare a state variable named "yearmonth" with a default value of "2022-10"
    const [yearmonth, setYearMonth] = useState(props.yearmonth);

    const updateYearMonth = (newYearMonth) => {
        props.setYearmonth(newYearMonth);
        setYearMonth(newYearMonth);
    }

    // Declare a function to navigate to the previous month
    const navigateToPreviousMonth = () => {
        // Parse the year and month from the current "yearmonth" value
        const [year, month] = yearmonth.split('-').map(Number);

        // Decrement the month by 1
        const previousMonth = month - 1;

        // If the month is less than 1, set it to 12 (December) and decrement the year
        if (previousMonth < 1) {
            updateYearMonth(`${year - 1}-12`);
        } else {
            // Otherwise, set the month to the previous month, with a leading zero if necessary
            updateYearMonth(`${year}-${previousMonth.toString().padStart(2, '0')}`);
        }
    };

    // Declare a function to navigate to the next month
    const navigateToNextMonth = () => {
        // Parse the year and month from the current "yearmonth" value
        const [year, month] = yearmonth.split('-').map(Number);

        // Increment the month by 1
        const nextMonth = month + 1;

        // If the month is greater than 12, set it to 1 (January) and increment the year
        if (nextMonth > 12) {
            updateYearMonth(`${year + 1}-01`);
        } else {
            // Otherwise, set the month to the next month, with a leading zero if necessary
            updateYearMonth(`${year}-${nextMonth.toString().padStart(2, '0')}`);
        }
    };

    const navigateToToday = () => {
        updateYearMonth(new Date().getFullYear() + "-" + (new Date().getMonth() + 1));
    };

    useEffect(() => {
        setYearMonth(props.yearmonth)
    }, [props]);

    return (
        <div className="month-navigation">
            <Button variant="secondary" onClick={navigateToPreviousMonth}>Volgende</Button>
            <Button variant="primary" onClick={navigateToToday}>Vandaag</Button>
            <Button variant="secondary" onClick={navigateToNextMonth}>Vorige</Button>
        </div>
    );
}
