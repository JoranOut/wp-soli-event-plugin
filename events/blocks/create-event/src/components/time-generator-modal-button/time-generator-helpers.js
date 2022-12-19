export function generateWeeks(startDate, endDate){
    const dates = []
    for (let d = incrementByWeek(startDate); d < endDate; d = incrementByWeek(d)) {
        dates.push(d);
    }
    return dates;
}

function incrementByWeek(date){
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 7)
    return newDate;
}

export function generateBiWeekly(startDate, endDate){
    const dates = []
    for (let d = incrementBiWeekly(startDate); d < endDate; d = incrementBiWeekly(d)) {
        dates.push(d);
    }
    return dates;
}

function incrementBiWeekly(date){
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 14)
    return newDate;
}


export function generateMonths(startDate, endDate){
    const dates = []
    for (let d = incrementByMonth(startDate); d < endDate; d = incrementByMonth(d)) {
        dates.push(d);
    }
    return dates;
}

function incrementByMonth(date){
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1)
    return newDate;
}
