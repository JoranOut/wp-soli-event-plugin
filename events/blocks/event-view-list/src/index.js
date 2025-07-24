import "./index.scss"
import ListView from "./components/list-view/list-view"
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';

wp.blocks.registerBlockType("soli/event-view-list", {
    title: "Event View List",
    icon: "list-view",
    category: "soli",
    edit: EditComponent,
    attributes: {
        events_per_page: {
            type: 'number',
            default: 3,
        },
    }
})

function EditComponent({ attributes, setAttributes }) {
    const { events_per_page } = attributes;

    return (
        <>
            <InspectorControls>
                <PanelBody title="Settings" initialOpen={true}>
                    <RangeControl
                        label="Events Per Page"
                        value={events_per_page}
                        onChange={(value) => setAttributes({ events_per_page: value })}
                        min={1}
                        max={20}
                    />
                </PanelBody>
            </InspectorControls>

            <ListView eventsPerPage={events_per_page}/>
        </>
    )
}

