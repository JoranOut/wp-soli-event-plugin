/**
 * Keeps MUI/Emotion runtime styles in the same document as the elements they style.
 *
 * The block editor renders block content inside the `editor-canvas` iframe, but
 * Emotion defaults its style container to the parent `wp-admin` document. The
 * compiled block stylesheet is registered as `editor_style` and therefore does
 * reach the iframe; the runtime-injected MUI styles do not, which leaves the
 * block unstyled in the editor.
 *
 * This component resolves the document it is actually mounted in and provides:
 *  - an Emotion cache inserting into that document's head, and
 *  - a MUI theme whose portalled components (Popper, Popover, Modal, Dialog)
 *    render into that same document's body, so date pickers and dropdowns stay
 *    together with their styles.
 *
 * Caches and themes are memoised per document, so nesting a scope (for example
 * inside a `@wordpress/components` Modal, which portals into the parent
 * document) is cheap and reuses the parent document's cache.
 */
import {useMemo, useState} from '@wordpress/element';
import createCache from '@emotion/cache';
import {CacheProvider} from '@emotion/react';
import {ThemeProvider, createTheme} from '@mui/material/styles';

const caches = new WeakMap();
const themes = new WeakMap();

function cacheForDocument(doc) {
    if (!caches.has(doc)) {
        caches.set(doc, createCache({key: 'soli-event', container: doc.head}));
    }
    return caches.get(doc);
}

function themeForDocument(doc) {
    if (!themes.has(doc)) {
        const container = () => doc.body;
        themes.set(doc, createTheme({
            components: {
                MuiPopper: {defaultProps: {container}},
                MuiPopover: {defaultProps: {container}},
                MuiModal: {defaultProps: {container}},
                MuiDialog: {defaultProps: {container}},
            },
        }));
    }
    return themes.get(doc);
}

export default function EditorStyleScope({children}) {
    const [root, setRoot] = useState(null);
    const doc = root?.ownerDocument ?? null;

    const cache = useMemo(() => (doc?.head ? cacheForDocument(doc) : null), [doc]);
    const theme = useMemo(() => (doc?.body ? themeForDocument(doc) : null), [doc]);

    return (
        <div className="soli-style-scope" style={{display: 'contents'}} ref={setRoot}>
            {cache && theme && (
                <CacheProvider value={cache}>
                    <ThemeProvider theme={theme}>{children}</ThemeProvider>
                </CacheProvider>
            )}
        </div>
    );
}
