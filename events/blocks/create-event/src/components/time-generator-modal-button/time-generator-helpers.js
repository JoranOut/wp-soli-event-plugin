export function generateWeeksUntil(startDate, endDate, endRepeatDate) {
    const dates = [];
    for (let s = incrementByWeek(startDate), e = incrementByWeek(endDate); s <= endRepeatDate; s = incrementByWeek(s), e = incrementByWeek(e)) {
        dates.push({startDate: s, endDate: e});
    }
    return dates;
}

export function generateWeeksTimes(startDate, endDate, endRepeatDate, times) {
    let datePointer = {startDate: new Date(startDate), endDate: new Date(endDate)};
    const dates = [];

    for (let d = 0; d < times; d++) {
        datePointer = {startDate: incrementByWeek(datePointer.startDate), endDate: incrementByWeek(datePointer.endDate)};
        dates.push(datePointer);
    }
    return dates;
}

function incrementByWeek(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 7);
    return newDate;
}

export function generateBiWeeklyUntil(startDate, endDate, endRepeatDate) {
    const dates = [];
    for (let s = incrementBiWeekly(startDate), e = incrementBiWeekly(endDate); s <= endRepeatDate; s = incrementBiWeekly(s), e = incrementBiWeekly(e)) {
        dates.push({startDate: s, endDate: e});
    }
    return dates;
}

export function generateBiWeeklyTimes(startDate, endDate, endRepeatDate, times) {
    let datePointer = {startDate: new Date(startDate), endDate: new Date(endDate)};
    const dates = [];

    for (let d = 0; d < times; d++) {
        datePointer = {startDate: incrementBiWeekly(datePointer.startDate), endDate: incrementBiWeekly(datePointer.endDate)};
        dates.push(datePointer);
    }
    return dates;
}

function incrementBiWeekly(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 14);
    return newDate;
}

export function generateMonthsUntil(startDate, endDate, endRepeatDate) {
    const dates = [];
    for (let s = incrementByMonth(startDate), e = incrementByMonth(endDate); s <= endRepeatDate; s = incrementByMonth(s), e = incrementByMonth(e)) {
        dates.push({startDate: s, endDate: e});
    }
    return dates;
}

export function generateMonthsTimes(startDate, endDate, endRepeatDate, times) {
    let datePointer = {startDate: new Date(startDate), endDate: new Date(endDate)};
    const dates = [];

    for (let d = 0; d < times; d++) {
        datePointer = {startDate: incrementByMonth(datePointer.startDate), endDate: incrementByMonth(datePointer.endDate)};
        dates.push(datePointer);
    }
    return dates;
}

function incrementByMonth(date) {
    const newDate = new Date(date);
    const day = newDate.getDate();
    // Move to the first of the month before changing month so a high day-of-month
    // (e.g. the 31st) can't overflow into a later month — a bare setMonth(+1) on
    // Jan 31 yields Mar 3, silently skipping February. Then clamp to the target
    // month's last day.
    newDate.setDate(1);
    newDate.setMonth(newDate.getMonth() + 1);
    const lastDayOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    newDate.setDate(Math.min(day, lastDayOfMonth));
    return newDate;
}
