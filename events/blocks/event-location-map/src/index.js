import "./index.scss"
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
import { useSelect } from '@wordpress/data';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl, RangeControl } from '@wordpress/components';

wp.blocks.registerBlockType("soli/event-location-map", {
    title: __("Event Location Map", "soli-event"),
    description: __("Shows the location of the current event date on a map.", "soli-event"),
    icon: "location-alt",
    category: "soli",
    supports: {
        html: false,
    },
    attributes: {
        heading: { type: 'string', default: __('Location', 'soli-event') },
        zoom: { type: 'number', default: 15 },
        homeName: { type: 'string', default: 'Muziekcentrum' },
        homeAddress: { type: 'string', default: 'Kerkpad 83, Santpoort-Noord' },
        postId: { type: 'number' },
        isPreview: { type: 'boolean', default: false },
    },
    edit: EditComponent,
    save: () => null,
})

function EditComponent({ attributes, setAttributes }) {
    const blockProps = useBlockProps();
    const { heading, zoom, homeName, homeAddress } = attributes;

    // Feed the post being edited to the preview so the map resolves its date
    // in the editor. Not persisted - only handed to ServerSideRender.
    const postId = useSelect((select) => select('core/editor')?.getCurrentPostId(), []);

    return (
        <div {...blockProps}>
            <InspectorControls>
                <PanelBody title={__("Map", "soli-event")} initialOpen={true}>
                    <TextControl
                        label={__("Card heading", "soli-event")}
                        value={heading}
                        onChange={(value) => setAttributes({ heading: value })}
                    />
                    <RangeControl
                        label={__("Zoom level", "soli-event")}
                        value={zoom}
                        min={3}
                        max={18}
                        onChange={(value) => setAttributes({ zoom: value })}
                    />
                </PanelBody>
                <PanelBody title={__("Home venue", "soli-event")} initialOpen={false}>
                    <TextControl
                        label={__("Name", "soli-event")}
                        help={__("Shown for dates at the internal venue (rooms, no external location).", "soli-event")}
                        value={homeName}
                        onChange={(value) => setAttributes({ homeName: value })}
                    />
                    <TextControl
                        label={__("Address", "soli-event")}
                        value={homeAddress}
                        onChange={(value) => setAttributes({ homeAddress: value })}
                    />
                </PanelBody>
            </InspectorControls>

            {/* isPreview swaps the Leaflet container for a static OSM embed:
                scripts inside ServerSideRender HTML never execute. */}
            <ServerSideRender
                block="soli/event-location-map"
                attributes={{ ...attributes, postId: postId || attributes.postId, isPreview: true }}
            />
        </div>
    )
}
