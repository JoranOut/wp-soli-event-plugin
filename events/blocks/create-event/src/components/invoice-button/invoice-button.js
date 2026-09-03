import "./invoice-button.scss";
import EditorStyleScope from "../../../../../inc/editor-style-scope";
import { __, _n, sprintf } from "@wordpress/i18n";
import { Modal, Button } from "@wordpress/components";
import { createPortal, useEffect, useMemo, useState } from "@wordpress/element";
import { useSelect } from "@wordpress/data";
import { PluginDocumentSettingPanel } from "@wordpress/editor";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import dayjs from "dayjs";
import "dayjs/locale/nl";

import receiptSVG from "../../../../../../inc/assets/img/icons/receipt.svg";
import { useEventState } from "../events-context";
import { durationInHours, formatHours, generateInvoiceDocx, invoiceFileName } from "./invoice-docx";

/**
 * The editor header has no public slot for a plain button (PinnedItems is only
 * reachable through PluginSidebar, which would replace the dialog with a
 * sidebar), so claim a spot in it by hand: keep an own container parked left of
 * the Publish button and portal the trigger into it. Returns null while the
 * header is absent - the caller then falls back to rendering inside the block,
 * so the feature survives a header markup change.
 */
function useEditorHeaderSlot() {
    const [slot, setSlot] = useState(null);

    useEffect(() => {
        const container = document.createElement("div");
        container.className = "soli-invoice-header-slot";

        const attach = () => {
            if (container.isConnected) {
                return;
            }
            const settings = document.querySelector(".editor-header__settings");
            if (!settings) {
                return;
            }
            const publish = settings.querySelector(
                ".editor-post-publish-panel__toggle, .editor-post-publish-button__button"
            );
            settings.insertBefore(container, publish);
            setSlot(container);
        };

        attach();
        // Re-attach when the editor re-renders its header (switching between the
        // publish flow and the saved state replaces those children).
        const header = document.querySelector(".editor-header") || document.body;
        const observer = new MutationObserver(attach);
        observer.observe(header, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            container.remove();
        };
    }, []);

    return slot;
}

function InvoiceButton() {
    const { events } = useEventState();
    const postTitle = useSelect(
        (select) => select("core/editor")?.getEditedPostAttribute("title"),
        []
    );

    const [isOpen, setOpen] = useState(false);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [excluded, setExcluded] = useState(new Set());
    const [rate, setRate] = useState("0");
    const [busy, setBusy] = useState(false);
    const headerSlot = useEditorHeaderSlot();

    const rows = useMemo(
        () =>
            events
                .map((event, index) => ({
                    key: event.id != null ? `id-${event.id}` : `new-${index}`,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    start: dayjs(event.startDate),
                }))
                .filter((row) => row.start.isValid())
                .sort((a, b) => a.start.valueOf() - b.start.valueOf()),
        [events]
    );

    const openModal = () => {
        // Default the period to the whole event so every date starts selected.
        setFromDate(rows.length ? rows[0].start.startOf("day") : null);
        setToDate(rows.length ? rows[rows.length - 1].start.startOf("day") : null);
        setExcluded(new Set());
        setOpen(true);
    };
    const closeModal = () => setOpen(false);

    const rowsInRange = rows.filter(
        (row) =>
            (!fromDate?.isValid() || !row.start.isBefore(fromDate.startOf("day"))) &&
            (!toDate?.isValid() || !row.start.isAfter(toDate.endOf("day")))
    );
    const selectedRows = rowsInRange.filter((row) => !excluded.has(row.key));

    const toggleRow = (key) => {
        const next = new Set(excluded);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        setExcluded(next);
    };

    const download = async () => {
        setBusy(true);
        try {
            const blob = await generateInvoiceDocx({
                title: postTitle || __("Event", "soli-event"),
                dates: selectedRows,
                hourlyRate: parseFloat(String(rate).replace(",", ".")) || 0,
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = invoiceFileName(postTitle);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            closeModal();
        } finally {
            setBusy(false);
        }
    };

    // Icon-only with a tooltip: the header runs out of room for a labelled
    // button, and its other controls read the same way.
    const trigger = (
        <Button
            className="invoice-button"
            size="compact"
            icon={<img src={receiptSVG} alt="" width={24} height={24}/>}
            label={__("Invoice this event", "soli-event")}
            showTooltip={true}
            onClick={openModal}
        />
    );

    return (
        <>
            {headerSlot
                ? createPortal(trigger, headerSlot)
                : <div className="event-invoice-row">{trigger}</div>}
            <PluginDocumentSettingPanel
                name="soli-invoice"
                title={__("Invoice", "soli-event")}
                className="invoice-document-panel"
            >
                <Button
                    className="invoice-panel-button"
                    variant="secondary"
                    icon={<img src={receiptSVG} alt="" width={20} height={20}/>}
                    text={__("Invoice this event", "soli-event")}
                    onClick={openModal}
                />
            </PluginDocumentSettingPanel>
            {isOpen && (
                <Modal
                    className="invoice-event-modal"
                    title={__("Invoice this event", "soli-event")}
                    onRequestClose={closeModal}
                    shouldCloseOnEsc={true}
                    shouldCloseOnClickOutside={true}
                >
                    <EditorStyleScope>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="nl">
                            <p className="invoice-help">
                                {__(
                                    "Choose the period and the dates to invoice, then download the invoice as a Word document.",
                                    "soli-event"
                                )}
                            </p>
                            <div className="invoice-range">
                                <DatePicker
                                    label={__("From", "soli-event")}
                                    value={fromDate}
                                    onChange={(date) => setFromDate(date)}
                                    format="D MMMM YYYY"
                                />
                                <DatePicker
                                    label={__("Until", "soli-event")}
                                    value={toDate}
                                    onChange={(date) => setToDate(date)}
                                    format="D MMMM YYYY"
                                />
                            </div>
                            <div className="invoice-date-list">
                                {rowsInRange.map((row) => {
                                    const start = row.start.locale("nl");
                                    const end = dayjs(row.endDate).locale("nl");
                                    const sameDay = start.isSame(end, "day");
                                    return (
                                        <label key={row.key} className="invoice-date-row">
                                            <Checkbox
                                                size="small"
                                                checked={!excluded.has(row.key)}
                                                onChange={() => toggleRow(row.key)}
                                            />
                                            <span className="invoice-date-label">
                                                {start.format("dd DD-MM-YYYY HH:mm")}
                                                {" - "}
                                                {sameDay ? end.format("HH:mm") : end.format("dd DD-MM-YYYY HH:mm")}
                                            </span>
                                            <span className="invoice-date-duration">
                                                {sprintf(
                                                    /* translators: %s: number of hours, e.g. 2,50 */
                                                    __("%s hours", "soli-event"),
                                                    formatHours(durationInHours(row))
                                                )}
                                            </span>
                                        </label>
                                    );
                                })}
                                {rowsInRange.length === 0 && (
                                    <p className="invoice-empty">
                                        {__("No dates in the chosen period.", "soli-event")}
                                    </p>
                                )}
                            </div>
                            <div className="invoice-footer">
                                <TextField
                                    className="invoice-rate"
                                    label={__("Hourly rate (€)", "soli-event")}
                                    size="small"
                                    value={rate}
                                    onChange={(event) => setRate(event.target.value)}
                                    inputProps={{ inputMode: "decimal" }}
                                />
                                <span className="invoice-selected-count">
                                    {sprintf(
                                        /* translators: %d: number of selected dates */
                                        _n("%d date selected", "%d dates selected", selectedRows.length, "soli-event"),
                                        selectedRows.length
                                    )}
                                </span>
                                <Button
                                    variant="primary"
                                    className="invoice-download-button"
                                    disabled={busy || selectedRows.length === 0}
                                    onClick={download}
                                >
                                    {__("Download invoice", "soli-event")}
                                </Button>
                            </div>
                        </LocalizationProvider>
                    </EditorStyleScope>
                </Modal>
            )}
        </>
    );
}

export default InvoiceButton;
