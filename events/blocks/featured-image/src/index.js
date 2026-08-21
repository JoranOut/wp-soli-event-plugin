import './index.scss';
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { useRef, useState, useEffect } from '@wordpress/element';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

wp.blocks.registerBlockType( 'soli/featured-image', {
    title: __( 'Event Featured Image', 'soli-event' ),
    description: __( 'Displays the featured image of the current event with an optional caption overlay.', 'soli-event' ),
    icon: 'format-image',
    category: 'soli',
    supports: {
        align: [ 'full', 'wide' ],
        html:  false,
    },
    attributes: {
        caption:     { type: 'string', default: '' },
        aspectRatio: { type: 'string', default: '16/9' },
    },
    edit: EditComponent,
    save: () => null,
} );

const ASPECT_OPTIONS = [
    { value: '16/9',  label: '16 : 9'  },
    { value: '4/3',   label: '4 : 3'   },
    { value: '3/2',   label: '3 : 2'   },
    { value: '1/1',   label: '1 : 1'   },
    { value: '21/9',  label: '21 : 9'  },
];

/**
 * Thin wrapper that creates an Emotion style cache scoped to the document that
 * owns the block's DOM node.  In WordPress 7.1+ the editor runs in an iframe,
 * so `document` inside the React tree is the iframe's document — but Emotion's
 * default insertion point is still the *outer* wp-admin document, which means
 * runtime MUI styles would never reach the editor canvas.
 *
 * Passing `container: ownerDocument.head` to `createCache` keeps every
 * `<style>` tag inside the correct document without touching any other part of
 * the block's registration or build pipeline.
 */
function IframeAwareMuiProvider( { children } ) {
    const anchorRef   = useRef( null );
    const [ cache, setCache ] = useState( null );

    useEffect( () => {
        const node = anchorRef.current;
        if ( ! node ) return;

        const ownerDoc = node.ownerDocument;
        setCache(
            createCache( {
                key:       'soli-fi',
                container: ownerDoc.head,
                prepend:   true,
            } )
        );
    }, [] );

    return (
        // The anchor <span> must be inside the block's DOM subtree so that
        // ownerDocument resolves to the editor iframe's document, not the
        // outer wp-admin document.
        <>
            <span ref={ anchorRef } style={ { display: 'none' } } />
            { cache ? (
                <CacheProvider value={ cache }>{ children }</CacheProvider>
            ) : children }
        </>
    );
}

function EditComponent( { attributes, setAttributes } ) {
    const blockProps     = useBlockProps();
    const { caption, aspectRatio } = attributes;

    return (
        <div { ...blockProps }>
            <InspectorControls>
                <PanelBody title={ __( 'Image settings', 'soli-event' ) } initialOpen={ true }>
                    { /* MUI controls are wrapped so their Emotion runtime styles go into
                         the editor iframe's <head>, not the outer wp-admin document. */ }
                    <IframeAwareMuiProvider>
                        <TextField
                            label={ __( 'Caption overlay', 'soli-event' ) }
                            helperText={ __( 'Leave empty to hide the caption bar.', 'soli-event' ) }
                            value={ caption }
                            onChange={ ( e ) => setAttributes( { caption: e.target.value } ) }
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={ { mb: 2 } }
                        />
                        <TextField
                            select
                            label={ __( 'Aspect ratio', 'soli-event' ) }
                            value={ aspectRatio }
                            onChange={ ( e ) => setAttributes( { aspectRatio: e.target.value } ) }
                            variant="outlined"
                            size="small"
                            fullWidth
                        >
                            { ASPECT_OPTIONS.map( ( opt ) => (
                                <MenuItem key={ opt.value } value={ opt.value }>
                                    { opt.label }
                                </MenuItem>
                            ) ) }
                        </TextField>
                    </IframeAwareMuiProvider>
                </PanelBody>
            </InspectorControls>

            { /* Front-end preview via server-side render is not used here; the
                 editor shows a representative placeholder instead so no extra
                 REST request is needed for a simple image block. */ }
            <div className="soli-featured-image-editor">
                <div
                    className="soli-featured-image soli-featured-image--empty"
                    style={ { aspectRatio } }
                >
                    <p>{ __( 'Featured image · set via the document panel', 'soli-event' ) }</p>
                    { caption && (
                        <figcaption className="soli-featured-image__caption">
                            { caption }
                        </figcaption>
                    ) }
                </div>
            </div>
        </div>
    );
}
