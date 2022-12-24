export default function MonthDisplay({ yearmonth }) {
    // Declare an array of month names in Dutch
    const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

    // Parse the year and month from the "yearmonth" property
    const [year, month] = yearmonth.split('-').map(Number);

    return (
        <h1>
            {monthNames[month - 1]} {year}
        </h1>
    );
}
