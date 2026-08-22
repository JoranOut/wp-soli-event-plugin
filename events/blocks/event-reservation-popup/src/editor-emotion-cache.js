import { useRef, useState, useLayoutEffect } from '@wordpress/element';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';

/**
 * Wraps children in an Emotion CacheProvider whose insertion container is
 * the ownerDocument of the wrapper element.  This is required for WordPress
 * 7.1+ where the block editor canvas is rendered inside an <iframe>: Emotion
 * would otherwise inject <style> tags into the parent document's <head>, which
 * is not visible inside the iframe.
 *
 * On initial render a default cache (targeting the top-level document) is used
 * so children are never unmounted.  useLayoutEffect then switches to a cache
 * that targets the correct document synchronously before the browser paints.
 */
export default function EditorEmotionCache({ children }) {
    const ref = useRef( null );
    const [cache, setCache] = useState( () => createCache( { key: 'soli-rp' } ) );

    useLayoutEffect( () => {
        if ( ! ref.current ) return;
        const ownerDoc = ref.current.ownerDocument;
        if ( ownerDoc === document ) return;
        setCache( createCache( { key: 'soli-rp', container: ownerDoc.head } ) );
    }, [] );

    return (
        <div ref={ ref } style={ { display: 'contents' } }>
            <CacheProvider value={ cache }>
                { children }
            </CacheProvider>
        </div>
    );
}
