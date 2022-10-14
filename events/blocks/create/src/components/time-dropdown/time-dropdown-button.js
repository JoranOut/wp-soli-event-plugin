import "./time-dropdown-button.scss"
import {Button} from "@wordpress/components"
import {useState} from '@wordpress/element';

function TimeDropdownButton(props) {
    const [drop, setDrop] = useState(false);

    const validateMinimalTime = (newTime) => {
        // TODO
        return 0 <= newTime.hours && newTime.hours < 24 && 0 <= newTime.minutes && newTime.minutes < 60;
    };

    const addZeroIfSingleDigit = (time) => {
        return {
            hours: ('00' + time.hours).slice(-2), minutes: ('00' + time.minutes).slice(-2)
        };
    };

    const createDropdownTimes = () => {
        const times = [];
        for (let i = 0; i < 24; i++) {
            for (let j = 0; j < 60; j = j + 5) {
                times.push(addZeroIfSingleDigit({
                    hours: i, minutes: j,
                }));
            }
        }
        return times;
    };

    const setTime = (newTime) => {
        setDrop(false);
        props.setTime({
            hours: newTime.getAttribute('data-hours'), minutes: newTime.getAttribute('data-minutes'),
        });
        props.onBlur();
    };

    const toggleDrop = () => {
        setDrop(!drop);
    };

    return (<div className="dropdown">
        <Button
            className="triangle"
            onClick={() => toggleDrop()}
            onBlur={() => props.onBlur()}
        />
        {drop && <div className="content">
            {createDropdownTimes().map(time => {
                return (<Button
                    key={time.hours + time.minutes}
                    data-hours={time.hours}
                    data-minutes={time.minutes}
                    onClick={(newTime) => setTime(newTime.target)}>
                    {time.hours}:{time.minutes}
                </Button>);
            })}
        </div>}
    </div>)
}

export default TimeDropdownButton;
