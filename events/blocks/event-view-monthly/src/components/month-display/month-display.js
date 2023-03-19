import {useEffect} from '@wordpress/element';

export default function MonthDisplay({yearmonth}) {
    // Declare an array of month names in Dutch
    const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

    // Parse the year and month from the "yearmonth" property
    const [year, month] = yearmonth.split('-').map(Number);

    useEffect(() => {
        const title = window.document.querySelector('.wp-block-post-title');
        if(title){
            title.innerHTML = "Agenda "+ monthNames[month - 1] +" "+ year;
        }
    }, [yearmonth])

    return (<></>);
}
