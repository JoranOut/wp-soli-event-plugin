import { __ } from "@wordpress/i18n";
import { CheckboxControl } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { PluginDocumentSettingPanel } from "@wordpress/editor";

const META_KEY = "soli_event_hide_in_calendar";

export default function HideInCalendarPanel() {
    const { isEvent, hideInCalendar } = useSelect((select) => {
        const editor = select("core/editor");
        return {
            isEvent: editor.getCurrentPostType() === "soli_event",
            hideInCalendar: !!editor.getEditedPostAttribute("meta")?.[META_KEY],
        };
    }, []);
    const { editPost } = useDispatch("core/editor");

    if (!isEvent) {
        return null;
    }

    return (
        <PluginDocumentSettingPanel
            name="soli-event-calendar"
            title={__("Calendar", "soli-event")}
            className="soli-event-calendar-panel"
        >
            <CheckboxControl
                __nextHasNoMarginBottom
                label={__("Hide in calendar", "soli-event")}
                help={__("The dates of this event are left out of the events calendar, in every view.", "soli-event")}
                checked={hideInCalendar}
                onChange={(checked) => editPost({ meta: { [META_KEY]: checked } })}
            />
        </PluginDocumentSettingPanel>
    );
}
