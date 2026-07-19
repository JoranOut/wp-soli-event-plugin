import "./index.scss"
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
import {
    InspectorControls,
    useBlockProps,
    MediaUpload,
    MediaUploadCheck,
    __experimentalLinkControl as LinkControl,
} from '@wordpress/block-editor';
import { PanelBody, TextControl, BaseControl, Button } from '@wordpress/components';

wp.blocks.registerBlockType("soli/concert-hero", {
    title: __("Concert Hero", "soli-event"),
    description: __("Hero banner for the next upcoming concert.", "soli-event"),
    icon: "megaphone",
    category: "soli",
    supports: {
        align: ["full", "wide"],
        html: false,
    },
    attributes: {
        eyebrow: { type: 'string', default: __('Next concert', 'soli-event') },
        primaryLabel: { type: 'string', default: __('Tickets & agenda →', 'soli-event') },
        agendaUrl: { type: 'string', default: '/agenda/' },
        secondaryLabel: { type: 'string', default: __('Become a member of Soli', 'soli-event') },
        secondaryUrl: { type: 'string', default: '/vereniging/#lid-worden' },
        fallbackImageId: { type: 'number' },
        fallbackImageUrl: { type: 'string', default: '' },
    },
    edit: EditComponent,
    save: () => null,
})

function EditComponent({ attributes, setAttributes }) {
    const blockProps = useBlockProps();
    const {
        eyebrow, primaryLabel, agendaUrl, secondaryLabel, secondaryUrl,
        fallbackImageId, fallbackImageUrl,
    } = attributes;

    return (
        <div {...blockProps}>
            <InspectorControls>
                <PanelBody title={__("Content", "soli-event")} initialOpen={true}>
                    <TextControl
                        label={__("Eyebrow label", "soli-event")}
                        value={eyebrow}
                        onChange={(value) => setAttributes({ eyebrow: value })}
                    />
                </PanelBody>
                <PanelBody title={__("Fallback background", "soli-event")} initialOpen={false}>
                    <FallbackImage
                        help={__("Shown when the concert has no featured image.", "soli-event")}
                        imageId={fallbackImageId}
                        imageUrl={fallbackImageUrl}
                        onSelect={(media) => setAttributes({ fallbackImageId: media.id, fallbackImageUrl: media.url })}
                        onRemove={() => setAttributes({ fallbackImageId: undefined, fallbackImageUrl: '' })}
                    />
                </PanelBody>
                <PanelBody title={__("Primary button", "soli-event")} initialOpen={false}>
                    <TextControl
                        label={__("Label", "soli-event")}
                        value={primaryLabel}
                        onChange={(value) => setAttributes({ primaryLabel: value })}
                    />
                    <LinkPicker
                        label={__("Agenda link", "soli-event")}
                        help={__("Used by the primary button and the card link.", "soli-event")}
                        url={agendaUrl}
                        onChange={(url) => setAttributes({ agendaUrl: url })}
                    />
                </PanelBody>
                <PanelBody title={__("Secondary button", "soli-event")} initialOpen={false}>
                    <TextControl
                        label={__("Label", "soli-event")}
                        value={secondaryLabel}
                        onChange={(value) => setAttributes({ secondaryLabel: value })}
                    />
                    <LinkPicker
                        label={__("Link", "soli-event")}
                        url={secondaryUrl}
                        onChange={(url) => setAttributes({ secondaryUrl: url })}
                    />
                </PanelBody>
            </InspectorControls>

            <ServerSideRender
                block="soli/concert-hero"
                attributes={attributes}
            />
        </div>
    )
}

// Media-library picker for the fallback background image. Stores the
// attachment id (authoritative) plus its url (for the editor preview); the
// render callback resolves the id server-side and only uses the url as a
// backstop.
function FallbackImage({ help, imageId, imageUrl, onSelect, onRemove }) {
    return (
        <BaseControl help={help} __nextHasNoMarginBottom>
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt=""
                    style={{ display: 'block', width: '100%', height: 'auto', marginBottom: '8px', borderRadius: '2px' }}
                />
            )}
            <MediaUploadCheck>
                <MediaUpload
                    allowedTypes={['image']}
                    value={imageId}
                    onSelect={onSelect}
                    render={({ open }) => (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="secondary" onClick={open}>
                                {imageId
                                    ? __("Replace image", "soli-event")
                                    : __("Select image", "soli-event")}
                            </Button>
                            {imageId && (
                                <Button variant="tertiary" isDestructive onClick={onRemove}>
                                    {__("Remove", "soli-event")}
                                </Button>
                            )}
                        </div>
                    )}
                />
            </MediaUploadCheck>
        </BaseControl>
    )
}

// Labeled wrapper around the editor's built-in link UI (post/page search +
// suggestions), storing just the resolved URL string on the attribute.
function LinkPicker({ label, help, url, onChange }) {
    return (
        <BaseControl label={label} help={help} __nextHasNoMarginBottom>
            <LinkControl
                value={url ? { url } : undefined}
                settings={[]}
                onChange={(value) => onChange((value && value.url) || '')}
                onRemove={() => onChange('')}
            />
        </BaseControl>
    )
}
