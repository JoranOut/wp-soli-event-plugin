import "./cancel-link-panel.scss";
import { __ } from "@wordpress/i18n";
import apiFetch from "@wordpress/api-fetch";
import { Button, ExternalLink, Notice, Spinner, TextControl, ToggleControl } from "@wordpress/components";
import { useCopyToClipboard } from "@wordpress/compose";
import { useSelect } from "@wordpress/data";
import { PluginDocumentSettingPanel } from "@wordpress/editor";
import { useEffect, useState } from "@wordpress/element";

/** Turns the secret cancellation link of this event on or off; the token is generated server-side. */
export default function CancelLinkPanel() {
    const { isEvent, postId, isNew } = useSelect((select) => {
        const editor = select("core/editor");
        return {
            isEvent: editor.getCurrentPostType() === "soli_event",
            postId: editor.getCurrentPostId(),
            isNew: editor.isEditedPostNew(),
        };
    }, []);
    const [link, setLink] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const copyRef = useCopyToClipboard(link?.url || "", () => setCopied(true));

    useEffect(() => {
        if (!isEvent || isNew || !postId) {
            return;
        }
        apiFetch({ path: `soli_event/v1/cancel-link/${postId}` }).then(setLink, (e) => setError(e.message));
    }, [isEvent, isNew, postId]);

    if (!isEvent) {
        return null;
    }

    const run = (action) => {
        setBusy(true);
        setError(null);
        setCopied(false);
        apiFetch({ path: `soli_event/v1/cancel-link/${postId}`, method: "POST", data: { action } })
            .then(setLink, (e) => setError(e.message))
            .finally(() => setBusy(false));
    };

    const rotate = () => {
        // eslint-disable-next-line no-alert
        if (window.confirm(__("The current link stops working. Continue?", "soli-event"))) {
            run("rotate");
        }
    };

    return (
        <PluginDocumentSettingPanel
            name="soli-event-cancel-link"
            title={__("Cancellation link", "soli-event")}
            className="soli-event-cancel-link-panel"
        >
            {isNew && <p>{__("Save the event first.", "soli-event")}</p>}
            {!isNew && !link && !error && <Spinner />}
            {error && <Notice status="error" isDismissible={false}>{error}</Notice>}
            {link && (
                <>
                    <ToggleControl
                        __nextHasNoMarginBottom
                        label={__("Allow cancelling through a link", "soli-event")}
                        help={__("Anyone with the link can cancel dates of this event, and undo that, without logging in. Cancelled dates are crossed out on the invoice.", "soli-event")}
                        checked={link.enabled}
                        disabled={busy}
                        onChange={(checked) => run(checked ? "enable" : "disable")}
                    />
                    {link.enabled && !link.has_page && (
                        <Notice status="warning" isDismissible={false}>
                            {__("No published page has the \"Cancel event dates\" block yet. Add it to a page; the link appears here.", "soli-event")}
                        </Notice>
                    )}
                    {link.enabled && link.url && (
                        <div className="soli-event-cancel-link">
                            <TextControl
                                __nextHasNoMarginBottom
                                label={__("Link", "soli-event")}
                                value={link.url}
                                readOnly
                                onFocus={(event) => event.target.select()}
                                onChange={() => {}}
                            />
                            <div className="soli-event-cancel-link__actions">
                                <Button variant="secondary" size="compact" ref={copyRef}>
                                    {copied ? __("Copied", "soli-event") : __("Copy link", "soli-event")}
                                </Button>
                                <ExternalLink href={link.url}>{__("Open", "soli-event")}</ExternalLink>
                                <Button variant="tertiary" size="compact" isDestructive disabled={busy} onClick={rotate}>
                                    {__("Renew link", "soli-event")}
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </PluginDocumentSettingPanel>
    );
}
