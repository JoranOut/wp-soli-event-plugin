import { useEffect, useMemo, useState } from "@wordpress/element";
import FullCalendar from "@fullcalendar/react";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import listPlugin from "@fullcalendar/react/list";
import nlLocale from "@fullcalendar/react/locales/nl";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import useSmallScreen from "../../../event-view-calendar/src/components/use-small-screen/use-small-screen";
import { SOLI_CLASS_HOOKS } from "../../../event-view-calendar/src/components/calendar-wrapper/soli-class-hooks";
// The calendar block's agenda skin, so both calendars look the same.
import "../../../event-view-calendar/src/components/calendar-wrapper/calendar-wrapper.scss";

const format = (template, ...values) =>
    values.reduce((text, value, index) => text.replace(`%${index + 1}$s`, value), template);

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date) => dayKey(date).slice(0, 7);
const iso = (value) => value.replace(" ", "T");
const time = (value) => value.slice(11, 16);

/**
 * Month calendar of one event's dates for the cancellation link. Each date is a chip that cancels or
 * restores it; each day has a button for all its dates at once. Phones get FullCalendar's month list.
 */
export default function CancelCalendar({ endpoint, token, i18n, initialDates, initialDate, locale, weekStart }) {
    const [dates, setDates] = useState(initialDates);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");

    // The toast clears itself; send() empties it first, so the same message twice still shows.
    useEffect(() => {
        if (!status) {
            return undefined;
        }
        const timer = setTimeout(() => setStatus(""), 5000);
        return () => clearTimeout(timer);
    }, [status]);
    const [month, setMonth] = useState(initialDate.slice(0, 7));
    const isSmallScreen = useSmallScreen();

    const byDay = useMemo(() => {
        const map = {};
        dates.forEach((date) => (map[date.start_date.slice(0, 10)] ||= []).push(date));
        return map;
    }, [dates]);

    // Weekdays the event never uses get no column.
    const hiddenDays = useMemo(() => {
        const used = new Set(dates.map((date) => new Date(iso(date.start_date)).getDay()));
        return [0, 1, 2, 3, 4, 5, 6].filter((dow) => !used.has(dow));
    }, []);

    const validRange = useMemo(() => {
        const first = new Date(iso(dates[0].start_date));
        const last = new Date(iso(dates[dates.length - 1].start_date));
        return {
            start: `${monthKey(first)}-01`,
            end: dayKey(new Date(last.getFullYear(), last.getMonth() + 1, 1)),
        };
    }, []);

    const send = async (targets, cancelled) => {
        setBusy(true);
        setStatus("");
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                credentials: "omit",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, date_ids: targets.map((date) => date.id), cancelled }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                setStatus(body.message || i18n.error);
                if (body.code === "soli_event_cancel_locked") {
                    const ids = targets.map((date) => date.id);
                    setDates((all) => all.map((date) => (ids.includes(date.id) ? { ...date, cancelled: true, locked: true } : date)));
                }
                return false;
            }
            const updated = Object.fromEntries((body.dates || []).map((date) => [date.id, date]));
            setDates((all) => all.map((date) => (updated[date.id] ? { ...date, ...updated[date.id] } : date)));
            return true;
        } catch (e) {
            setStatus(i18n.error);
            return false;
        } finally {
            setBusy(false);
        }
    };

    const toggleDate = async (date) => {
        const cancelled = !date.cancelled;
        if (await send([date], cancelled)) {
            setStatus(format(cancelled ? i18n.didCancel : i18n.didRestore, date.label));
        }
    };

    const toggleDay = async (dayDates) => {
        const open = dayDates.filter((date) => !date.locked);
        const cancelled = !open.every((date) => date.cancelled);
        if (await send(open.filter((date) => date.cancelled !== cancelled), cancelled)) {
            setStatus(format(cancelled ? i18n.didCancelDay : i18n.didRestoreDay, open[0].dayLabel));
        }
    };

    const dayButton = (key) => {
        const dayDates = byDay[key] || [];
        const open = dayDates.filter((d) => !d.locked);
        if (!open.length) {
            return null;
        }
        const undo = open.every((d) => d.cancelled);
        return (
            <button
                type="button"
                className="soli-cancel-dates__day-toggle"
                disabled={busy}
                aria-label={format(undo ? i18n.dayUndoLabel : i18n.dayCancelLabel, open[0].dayLabel)}
                onClick={() => toggleDay(dayDates)}
            >
                {undo ? i18n.undoDay : i18n.cancelDay}
            </button>
        );
    };

    // The day button is an all-day event that sorts first: FullCalendar renders the day number area
    // aria-hidden, so a button there would be invisible to screen readers.
    const events = [
        ...Object.keys(byDay).filter((key) => byDay[key].some((date) => !date.locked)).map((key) => ({
            id: `day-${key}`,
            start: key,
            allDay: true,
            order: 0,
            className: "soli-cancel-dates__day-event",
            extendedProps: { day: key },
        })),
        ...dates.map((date) => ({
            id: String(date.id),
            start: iso(date.start_date),
            end: iso(date.end_date),
            title: date.label,
            order: 1,
            className: ["soli-event", date.cancelled && "is-cancelled", date.locked && "is-locked"].filter(Boolean).join(" "),
            extendedProps: { date },
        })),
    ];

    const eventContent = ({ event }) => {
        if (event.extendedProps.day) {
            return dayButton(event.extendedProps.day);
        }
        const date = dates.find((d) => d.id === event.extendedProps.date.id);
        const text = `${time(date.start_date)}–${time(date.end_date)}`;
        const className = `soli-cancel-dates__chip${date.cancelled ? " is-cancelled" : ""}`;
        if (date.locked) {
            return (
                <span className={`${className} is-locked`} title={`${date.label} · ${i18n.cancelledBySoli}`}>
                    {text}
                    <span className="screen-reader-text"> {date.label}, {i18n.cancelledBySoli}</span>
                </span>
            );
        }
        return (
            <button
                type="button"
                className={className}
                title={date.label}
                disabled={busy}
                aria-label={format(date.cancelled ? i18n.chipUndo : i18n.chipCancel, date.label)}
                onClick={() => toggleDate(date)}
            >
                <span>{text}</span>
                <span className="soli-cancel-dates__chip-icon" aria-hidden="true">{date.cancelled ? "↺" : "×"}</span>
            </button>
        );
    };

    const inMonth = dates.filter((date) => date.start_date.startsWith(month));
    const active = inMonth.filter((date) => !date.cancelled);
    const minutes = active.reduce((sum, date) => sum + date.minutes, 0);
    const hours = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(minutes / 60);

    return (
        <div className="soli-cancel-dates__calendar soli-block-view-calendar">
            <p className="soli-cancel-dates__status" role="status" aria-live="polite">{status}</p>
            <p className="soli-cancel-dates__summary">
                {inMonth.length
                    ? format(i18n.summary, String(active.length), String(inMonth.length), hours)
                    : i18n.noDatesInMonth}
            </p>
            <FullCalendar
                key={isSmallScreen ? "list" : "grid"}
                plugins={[classicThemePlugin, dayGridPlugin, listPlugin]}
                initialView={isSmallScreen ? "listMonth" : "dayGridMonth"}
                initialDate={`${month}-01`}
                locale={locale.toLowerCase().startsWith("nl") ? nlLocale : "en-gb"}
                firstDay={weekStart}
                hiddenDays={hiddenDays}
                validRange={validRange}
                {...SOLI_CLASS_HOOKS}
                headerToolbar={isSmallScreen
                    ? { left: "title", right: "prev,next" }
                    : { left: "prev,next", center: "title", right: "" }}
                height="auto"
                fixedWeekCount={false}
                showNonCurrentDates={false}
                dayMaxEvents={false}
                displayEventTime={false}
                eventDisplay="block"
                events={events}
                eventOrder="order,start"
                eventContent={eventContent}
                datesSet={({ view }) => setMonth(monthKey(view.currentStart))}
            />
            <p className="soli-cancel-dates__legend">
                <span className="soli-cancel-dates__legend-pill">09:00</span> {i18n.goesAhead}
            </p>
        </div>
    );
}
