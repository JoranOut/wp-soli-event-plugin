import "./index.scss"
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
import {
    InspectorControls,
    useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

wp.blocks.registerBlockType("soli/my-groups", {
    title: __("My Orchestras", "soli-event"),
    description: __("The logged-in member's groups (from their Soli account) with each group's next event.", "soli-event"),
    icon: "groups",
    category: "soli",
    supports: {
        html: false,
    },
    attributes: {
        title: { type: 'string', default: __('My orchestras', 'soli-event') },
    },
    edit: EditComponent,
    save: () => null,
})

function EditComponent({ attributes, setAttributes }) {
    const blockProps = useBlockProps();
    const { title } = attributes;

    return (
        <div {...blockProps}>
            <InspectorControls>
                <PanelBody title={__("Content", "soli-event")} initialOpen={true}>
                    <TextControl
                        label={__("Title", "soli-event")}
                        value={title}
                        onChange={(value) => setAttributes({ title: value })}
                    />
                </PanelBody>
            </InspectorControls>

            <ServerSideRender
                block="soli/my-groups"
                attributes={attributes}
            />
        </div>
    )
}
