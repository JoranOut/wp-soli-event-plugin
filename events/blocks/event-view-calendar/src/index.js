import "./index.scss"
import CalendarWrapper from "./components/calendar-wrapper/calendar-wrapper";
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';

wp.blocks.registerBlockType("soli/event-view-calendar", {
    title: "Event View Calendar",
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
        <>
            <InspectorControls>
                <PanelBody title="Settings" initialOpen={true}>
                    <SelectControl
                        label="Default view"
                        value={calendar_type}
                        options={[
                            { label: 'Month', value: 'month' },
                            { label: 'Week', value: 'week' },
                            { label: 'Day', value: 'day' },
                        ]}
                        onChange={(value) => setAttributes({ calendar_type: value })}
                    />
                    <ToggleControl
                        label="Allow switching views"
                        checked={!!adjustable}
                        onChange={(value) => setAttributes({ adjustable: value })}
                    />
                    <ToggleControl
                        label="Only concerts"
                        checked={!!only_concerts}
                        onChange={(value) => setAttributes({ only_concerts: value })}
                    />
                    <ToggleControl
                        label="Show rooms filter"
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
    )
}
