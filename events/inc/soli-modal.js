/**
 * A `@wordpress/components` Modal that keeps its MUI styling.
 *
 * A Modal portals into the parent `wp-admin` document, but React context flows
 * through a portal unchanged - so a Modal opened from a block inside the
 * editor-canvas iframe inherits that block's [[EditorStyleScope]] cache, which
 * inserts into the *iframe's* head. The Modal then renders in one document with
 * its styles in another, and MUI's rules never apply: a Checkbox shows its raw
 * native input next to the icon that should have replaced it.
 *
 * Re-scoping inside the Modal fixes that, and doing it here rather than at each
 * call site means a new Modal cannot forget to. Use this instead of importing
 * `Modal` from `@wordpress/components` directly; props are passed straight
 * through.
 */
import {Modal} from '@wordpress/components';
import EditorStyleScope from './editor-style-scope';

export default function SoliModal({children, ...props}) {
    return (
        <Modal {...props}>
            <EditorStyleScope>{children}</EditorStyleScope>
        </Modal>
    );
}
