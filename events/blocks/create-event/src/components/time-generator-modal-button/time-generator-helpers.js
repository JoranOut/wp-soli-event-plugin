export function generateWeeksUntil(startDate, endDate, endRepeatDate) {
    const dates = [{startDate: new Date(startDate), endDate: new Date(endDate)}]
    for (let s = incrementByWeek(startDate), e = incrementByWeek(endDate); s < endRepeatDate; s = incrementByWeek(s), e = incrementByWeek(e)) {
        dates.push({startDate: s, endDate: e});
    }
    return dates;
}

export function generateWeeksTimes(startDate, endDate, endRepeatDate, times) {
    let curr_date = {startDate: new Date(startDate), endDate: new Date(endDate)};
    const dates = [curr_date]

    for (let d = 0; d < times; d++) {
        curr_date = {startDate: incrementByWeek(curr_date.startDate), endDate: incrementByWeek(curr_date.endDate)}
        dates.push(curr_date);
    }
    return dates;
}

function incrementByWeek(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 7)
    return newDate;
}

export function generateBiWeeklyUntil(startDate, endDate, endRepeatDate) {
    const dates = [{startDate: new Date(startDate), endDate: new Date(endDate)}]
    for (let s = incrementBiWeekly(startDate), e = incrementBiWeekly(endDate); s < endRepeatDate; s = incrementBiWeekly(s), e = incrementBiWeekly(e)) {
        dates.push({startDate: s, endDate: e});
    }
    return dates;
}

export function generateBiWeeklyTimes(startDate, endDate, endRepeatDate, times) {
    let curr_date = {startDate: new Date(startDate), endDate: new Date(endDate)};
    const dates = [curr_date]

    for (let d = 0; d < times; d++) {
        curr_date = {startDate: incrementBiWeekly(curr_date.startDate), endDate: incrementBiWeekly(curr_date.endDate)}
        dates.push(curr_date);
    }
    return dates;
}

function incrementBiWeekly(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 14)
    return newDate;
}

export function generateMonthsUntil(startDate, endDate, endRepeatDate) {
    const dates = [{startDate: new Date(startDate), endDate: new Date(endDate)}]
    for (let s = incrementByMonth(startDate), e = incrementByMonth(endDate); s < endRepeatDate; s = incrementByMonth(s), e = incrementByMonth(e)) {
        dates.push({startDate: s, endDate: e});
    }
    return dates;
}

export function generateMonthsTimes(startDate, endDate, endRepeatDate, times) {
    let curr_date = {startDate: new Date(startDate), endDate: new Date(endDate)};
    const dates = [curr_date]

    for (let d = 0; d < times; d++) {
        curr_date = {startDate: incrementByMonth(curr_date.startDate), endDate: incrementByMonth(curr_date.endDate)}
        dates.push(curr_date);
    }
    return dates;
}

function incrementByMonth(date) {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1)
    return newDate;
}
