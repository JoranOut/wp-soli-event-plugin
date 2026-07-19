import "./index.scss"
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
import { useSelect } from '@wordpress/data';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl, TextareaControl, RangeControl } from '@wordpress/components';

wp.blocks.registerBlockType("soli/event-dates", {
    title: __("Event Upcoming Dates", "soli-event"),
    description: __("Lists the next upcoming dates of the current event.", "soli-event"),
    icon: "list-view",
    category: "soli",
    supports: {
        html: false,
    },
    attributes: {
        heading: { type: 'string', default: __('This event is recurring', 'soli-event') },
        count: { type: 'number', default: 5 },
        note: { type: 'string', default: '' },
        postId: { type: 'number' },
    },
    edit: EditComponent,
    save: () => null,
})

function EditComponent({ attributes, setAttributes }) {
    const blockProps = useBlockProps();
    const { heading, count, note } = attributes;

    // Feed the post being edited to the preview so the list resolves its dates
    // in the editor. Not persisted - only handed to ServerSideRender.
    const postId = useSelect((select) => select('core/editor')?.getCurrentPostId(), []);

    return (
        <div {...blockProps}>
            <InspectorControls>
                <PanelBody title={__("Content", "soli-event")} initialOpen={true}>
                    <TextControl
                        label={__("Card heading", "soli-event")}
                        value={heading}
                        onChange={(value) => setAttributes({ heading: value })}
                    />
                    <RangeControl
                        label={__("Number of dates", "soli-event")}
                        value={count}
                        min={2}
                        max={12}
                        onChange={(value) => setAttributes({ count: value })}
                    />
                    <TextareaControl
                        label={__("Note", "soli-event")}
                        help={__("Optional line shown under the list.", "soli-event")}
                        value={note}
                        onChange={(value) => setAttributes({ note: value })}
                    />
                </PanelBody>
            </InspectorControls>

            <ServerSideRender
                block="soli/event-dates"
                attributes={{ ...attributes, postId: postId || attributes.postId }}
            />
        </div>
    )
}
