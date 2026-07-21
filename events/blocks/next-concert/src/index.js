import "./index.scss"
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
import {
    InspectorControls,
    useBlockProps,
    __experimentalLinkControl as LinkControl,
} from '@wordpress/block-editor';
import { PanelBody, TextControl, TextareaControl, BaseControl, ToggleControl, SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';

wp.blocks.registerBlockType("soli/next-concert", {
    title: __("Next Concert", "soli-event"),
    description: __("Compact card linking the next upcoming concert.", "soli-event"),
    icon: "calendar-alt",
    category: "soli",
    supports: {
        html: false,
    },
    attributes: {
        eyebrow: { type: 'string', default: __('Concert agenda', 'soli-event') },
        lead: { type: 'string', default: __('The next concert on Soli’s programme.', 'soli-event') },
        buttonLabel: { type: 'string', default: __('Agenda →', 'soli-event') },
        agendaUrl: { type: 'string', default: '/agenda/' },
        onlyConcerts: { type: 'boolean', default: true },
        categoryId: { type: 'number', default: 0 },
    },
    edit: EditComponent,
    save: () => null,
})

function EditComponent({ attributes, setAttributes }) {
    const blockProps = useBlockProps();
    const { eyebrow, lead, buttonLabel, agendaUrl, onlyConcerts, categoryId } = attributes;

    const categories = useSelect(
        (select) => select(coreStore).getEntityRecords('taxonomy', 'category', { per_page: -1, orderby: 'name', order: 'asc' }),
        []
    );

    const categoryOptions = [
        { label: __("All categories (no filter)", "soli-event"), value: 0 },
        ...(categories || []).map((cat) => ({ label: cat.name, value: cat.id })),
    ];

    return (
        <div {...blockProps}>
            <InspectorControls>
                <PanelBody title={__("Selection", "soli-event")} initialOpen={true}>
                    <ToggleControl
                        label={__("Only concerts", "soli-event")}
                        help={onlyConcerts
                            ? __("Only event dates flagged as concerts are shown.", "soli-event")
                            : __("Any upcoming event date can be shown.", "soli-event")}
                        checked={onlyConcerts}
                        onChange={(value) => setAttributes({ onlyConcerts: value })}
                    />
                    <SelectControl
                        label={__("Category", "soli-event")}
                        value={categoryId}
                        options={categoryOptions}
                        onChange={(value) => setAttributes({ categoryId: parseInt(value, 10) || 0 })}
                    />
                </PanelBody>
                <PanelBody title={__("Content", "soli-event")} initialOpen={false}>
                    <TextControl
                        label={__("Eyebrow label", "soli-event")}
                        value={eyebrow}
                        onChange={(value) => setAttributes({ eyebrow: value })}
                    />
                    <TextareaControl
                        label={__("Lead text", "soli-event")}
                        value={lead}
                        onChange={(value) => setAttributes({ lead: value })}
                    />
                </PanelBody>
                <PanelBody title={__("Button", "soli-event")} initialOpen={false}>
                    <TextControl
                        label={__("Label", "soli-event")}
                        value={buttonLabel}
                        onChange={(value) => setAttributes({ buttonLabel: value })}
                    />
                    <BaseControl label={__("Link", "soli-event")} __nextHasNoMarginBottom>
                        <LinkControl
                            value={agendaUrl ? { url: agendaUrl } : undefined}
                            settings={[]}
                            onChange={(value) => setAttributes({ agendaUrl: (value && value.url) || '' })}
                            onRemove={() => setAttributes({ agendaUrl: '' })}
                        />
                    </BaseControl>
                </PanelBody>
            </InspectorControls>

            <ServerSideRender
                block="soli/next-concert"
                attributes={attributes}
            />
        </div>
    )
}
