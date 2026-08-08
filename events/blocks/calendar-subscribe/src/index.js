import "./index.scss"
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
import apiFetch from '@wordpress/api-fetch';
import { useState, useEffect } from '@wordpress/element';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl, TextareaControl, FormTokenField, ToggleControl, Spinner } from '@wordpress/components';

wp.blocks.registerBlockType("soli/calendar-subscribe", {
    title: __("Calendar subscribe", "soli-event"),
    description: __("Let visitors build an iCal subscribe link for concerts and/or orchestras.", "soli-event"),
    icon: "calendar-alt",
    category: "soli",
    supports: {
        align: ["wide"],
        html: false,
    },
    attributes: {
        heading: { type: 'string', default: '' },
        description: { type: 'string', default: '' },
        defaultConcerts: { type: 'boolean', default: false },
        defaultCategories: { type: 'array', default: [], items: { type: 'string' } },
    },
    edit: EditComponent,
    save: () => null,
})

function EditComponent({ attributes, setAttributes }) {
    const blockProps = useBlockProps();
    const { heading, description, defaultConcerts, defaultCategories } = attributes;

    const [categories, setCategories] = useState(null);

    useEffect(() => {
        let active = true;
        apiFetch({ path: '/soli_event/v1/feed-categories' })
            .then((data) => { if (active) setCategories(Array.isArray(data) ? data : []); })
            .catch(() => { if (active) setCategories([]); });
        return () => { active = false; };
    }, []);

    // FormTokenField works with display names; the attribute stores slugs.
    const slugToName = (slug) => {
        const cat = (categories || []).find((c) => c.slug === slug);
        return cat ? cat.name : slug;
    };
    const onChangeCategories = (tokens) => {
        const slugs = tokens
            .map((token) => {
                const value = typeof token === 'string' ? token : token.value;
                const cat = (categories || []).find((c) => c.name === value || c.slug === value);
                return cat ? cat.slug : null;
            })
            .filter(Boolean);
        setAttributes({ defaultCategories: [...new Set(slugs)] });
    };

    return (
        <div {...blockProps}>
            <InspectorControls>
                <PanelBody title={__("Content", "soli-event")} initialOpen={true}>
                    <TextControl
                        label={__("Heading", "soli-event")}
                        value={heading}
                        placeholder={__("Subscribe to the agenda", "soli-event")}
                        onChange={(value) => setAttributes({ heading: value })}
                    />
                    <TextareaControl
                        label={__("Description", "soli-event")}
                        value={description}
                        onChange={(value) => setAttributes({ description: value })}
                    />
                </PanelBody>
                <PanelBody title={__("Default selection", "soli-event")} initialOpen={true}>
                    <p className="soli-cal-subscribe-help">
                        {__("These options are pre-ticked when a visitor opens the page. They can still change them.", "soli-event")}
                    </p>
                    <ToggleControl
                        label={__("All concerts", "soli-event")}
                        checked={!!defaultConcerts}
                        onChange={(value) => setAttributes({ defaultConcerts: value })}
                    />
                    {categories === null && <Spinner />}
                    {categories !== null && categories.length === 0 && (
                        <p>{__("No categories are assigned to any published event yet.", "soli-event")}</p>
                    )}
                    {categories !== null && categories.length > 0 && (
                        <FormTokenField
                            label={__("Orchestras and groups", "soli-event")}
                            value={defaultCategories.map(slugToName)}
                            suggestions={categories.map((cat) => cat.name)}
                            onChange={onChangeCategories}
                            __experimentalExpandOnFocus
                            __experimentalShowHowTo={false}
                            __nextHasNoMarginBottom
                        />
                    )}
                </PanelBody>
            </InspectorControls>

            <ServerSideRender
                block="soli/calendar-subscribe"
                attributes={attributes}
            />
        </div>
    )
}
