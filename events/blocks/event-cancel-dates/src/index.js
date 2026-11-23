import "./index.scss";
import { __ } from "@wordpress/i18n";
import { RichText, useBlockProps } from "@wordpress/block-editor";

// Same msgids as the PHP fallbacks in index.php, so the placeholders show what an empty field renders.
const DEFAULTS = {
    intro: __("Click a time to cancel it, or cancel a whole day. A cancelled date stays on the list and is not charged. Click it again to undo.", "soli-event"),
    noLinkText: __("Open this page through the cancellation link you received from Soli.", "soli-event"),
    invalidText: __("This link is not valid (anymore). Ask Soli for a new link.", "soli-event"),
};

wp.blocks.registerBlockType("soli/event-cancel-dates", {
    apiVersion: 3,
    title: __("Cancel event dates", "soli-event"),
    description: __("Lets someone without an account cancel dates of one event, through the secret link from that event's sidebar.", "soli-event"),
    icon: "dismiss",
    category: "soli",
    attributes: {
        intro: { type: "string", default: "" },
        noLinkText: { type: "string", default: "" },
        invalidText: { type: "string", default: "" },
    },
    supports: {
        html: false,
        multiple: false,
        align: ["wide", "full"],
    },
    edit: EditComponent,
    save: () => null,
});

function TextField({ label, name, attributes, setAttributes }) {
    return (
        <div className="soli-cancel-dates__field">
            <span className="soli-cancel-dates__field-label">{label}</span>
            <RichText
                tagName="p"
                className="soli-cancel-dates__field-input"
                value={attributes[name]}
                placeholder={DEFAULTS[name]}
                allowedFormats={["core/bold", "core/italic", "core/link"]}
                onChange={(value) => setAttributes({ [name]: value })}
                aria-label={label}
            />
        </div>
    );
}

function EditComponent({ attributes, setAttributes }) {
    const blockProps = useBlockProps({ className: "soli-cancel-dates soli-cancel-dates--placeholder" });
    const field = { attributes, setAttributes };
    return (
        <div {...blockProps}>
            <p className="soli-cancel-dates__title">{__("Cancel event dates", "soli-event")}</p>
            <p>
                {__("Visitors who open this page through an event's cancellation link see that event's dates per month and can cancel them. Without a valid link the page shows nothing of any event.", "soli-event")}
            </p>
            <p>
                {__("Turn the link on in the \"Cancellation link\" panel of an event's sidebar.", "soli-event")}
            </p>
            <TextField name="intro" label={__("Intro above the calendar", "soli-event")} {...field} />
            <TextField name="noLinkText" label={__("Page opened without a link", "soli-event")} {...field} />
            <TextField name="invalidText" label={__("Link that is not valid (anymore)", "soli-event")} {...field} />
            <p className="soli-cancel-dates__field-hint">
                {__("Leave a text empty to use the default, which follows the site language.", "soli-event")}
            </p>
        </div>
    );
}
