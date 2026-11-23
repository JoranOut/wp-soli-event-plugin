import {joinClassNames} from '@fullcalendar/react';

// FullCalendar 7 no longer renders semantic fc-* classes, so the agenda skin
// in calendar-wrapper.scss hooks onto these soli-cal-* classes instead.
export const SOLI_CLASS_HOOKS = {
    toolbarClass: 'soli-cal-toolbar',
    toolbarSectionClass: ({name}) => `soli-cal-toolbar-${name}`,
    toolbarTitleClass: 'soli-cal-title',
    buttonGroupClass: 'soli-cal-button-group',
    buttonClass: ({name, isSelected}) => joinClassNames(
        'soli-cal-button',
        `soli-cal-button-${name}`,
        isSelected && 'soli-cal-button-active',
    ),
    viewClass: 'soli-cal-view',
    dayHeaderClass: 'soli-cal-day-header',
    dayHeaderInnerClass: 'soli-cal-day-header-inner',
    dayHeaderAlign: 'start',
    dayCellClass: ({isToday, isOther}) => joinClassNames(
        'soli-cal-day',
        isToday && 'soli-cal-day-today',
        isOther && 'soli-cal-day-other',
    ),
    dayCellTopClass: 'soli-cal-day-top',
    dayCellTopInnerClass: 'soli-cal-day-number',
    eventClass: 'soli-cal-event',
    rowEventClass: 'soli-cal-row-event',
    eventTitleClass: 'soli-cal-event-title',
    moreLinkClass: 'soli-cal-more-link',
    listDayHeaderClass: 'soli-cal-list-day-header',
    listDayHeaderInnerClass: 'soli-cal-list-day-header-inner',
    listItemEventClass: 'soli-cal-list-event',
    listItemEventTimeClass: 'soli-cal-list-event-time',
    listItemEventTitleClass: 'soli-cal-list-event-title',
    noEventsClass: 'soli-cal-no-events',
};
