import "./index.scss"
import { __ } from '@wordpress/i18n';
import CalendarWrapper from "./components/calendar-wrapper/calendar-wrapper";
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import EditorEmotionCache from "./editor-emotion-cache";

wp.blocks.registerBlockType("soli/event-view-calendar", {
    title: __("Event View Calendar", "soli-event"),
    icon: "calendar-alt",
    category: "soli",
    attributes: {
        calendar_type: { type: 'string', default: 'month' },
        adjustable: { type: 'boolean', default: false },
        only_concerts: { type: 'boolean', default: false },
        show_rooms_filter: { type: 'boolean', default: false },
    },
    edit: EditComponent
})

function EditComponent({ attributes, setAttributes }) {
    const { calendar_type, adjustable, only_concerts, show_rooms_filter } = attributes;

    return (
        <EditorEmotionCache>
            <>
                <InspectorControls>
                    <PanelBody title={__("Settings", "soli-event")} initialOpen={true}>
                        <SelectControl
                            label={__("Default view", "soli-event")}
                            value={calendar_type}
                            options={[
                                { label: __('Month', 'soli-event'), value: 'month' },
                                { label: __('Week', 'soli-event'), value: 'week' },
                                { label: __('Day', 'soli-event'), value: 'day' },
                            ]}
                            onChange={(value) => setAttributes({ calendar_type: value })}
                        />
                        <ToggleControl
                            label={__("Allow switching views", "soli-event")}
                            checked={!!adjustable}
                            onChange={(value) => setAttributes({ adjustable: value })}
                        />
                        <ToggleControl
                            label={__("Only concerts", "soli-event")}
                            checked={!!only_concerts}
                            onChange={(value) => setAttributes({ only_concerts: value })}
                        />
                        <ToggleControl
                            label={__("Show rooms filter", "soli-event")}
                            checked={!!show_rooms_filter}
                            onChange={(value) => setAttributes({ show_rooms_filter: value })}
                        />
                    </PanelBody>
                </InspectorControls>

                <CalendarWrapper
                    className="alignwide"
                    calendarType={calendar_type}
                    adjustable={adjustable}
                    onlyConcerts={only_concerts}
                    showRoomsFilter={show_rooms_filter}
                />
            </>
        </EditorEmotionCache>
    )
}
