import { __, sprintf } from "@wordpress/i18n";
import {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    ShadingType,
    SimpleField,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
} from "docx";
import dayjs from "dayjs";
import "dayjs/locale/nl";

// Sender details. Everything the repo does not know (postal code, bank and tax
// numbers) is left as a fill-in line rather than invented.
const SENDER = {
    name: "Muziekvereniging Soli",
    lines: ["Kerkpad 83", "Santpoort-Noord", "info@soli.nl", "soli.nl"],
};
const BLANK = "________________";

const PAYMENT_TERM_DAYS = 14;

// A4 with 2 cm margins: 11906 - 2 x 1134 twips of usable width.
const PAGE_MARGIN = 1134;
const CONTENT_WIDTH = 9638;
const LINE_COLUMNS = [3238, 1400, 1400, 1600, 2000];

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };
const HEADER_FILL = "EFEFEF";

const nlNumber = new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// Measured between whole minutes: stored dates can carry stray seconds, which
// would otherwise turn a clean 12:00-14:30 into 2,48 hours on the invoice.
export function durationInHours(date) {
    const minutes = dayjs(date.endDate)
        .startOf("minute")
        .diff(dayjs(date.startDate).startOf("minute"), "minute");
    return Math.max(minutes, 0) / 60;
}

export function formatHours(hours) {
    return nlNumber.format(hours);
}

export function invoiceFileName(title) {
    const slug = (title || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return [__("invoice", "soli-event"), slug || "event", dayjs().format("YYYY-MM-DD")].join("-") + ".docx";
}

function line(text, options = {}) {
    return new Paragraph({ children: [new TextRun({ text, ...options })] });
}

function cell(children, { width, align, shading, bold, columnSpan, verticalAlign } = {}) {
    return new TableCell({
        columnSpan,
        verticalAlign: verticalAlign ?? VerticalAlign.CENTER,
        width: width ? { size: width, type: WidthType.DXA } : undefined,
        shading: shading ? { type: ShadingType.CLEAR, fill: shading, color: "auto" } : undefined,
        margins: { top: 60, bottom: 60, left: 108, right: 108 },
        children: Array.isArray(children)
            ? children
            : [new Paragraph({ alignment: align, children: [new TextRun({ text: children, bold })] })],
    });
}

function fieldCell(children, { width, align = AlignmentType.RIGHT, shading, columnSpan } = {}) {
    return new TableCell({
        columnSpan,
        verticalAlign: VerticalAlign.CENTER,
        width: width ? { size: width, type: WidthType.DXA } : undefined,
        shading: shading ? { type: ShadingType.CLEAR, fill: shading, color: "auto" } : undefined,
        margins: { top: 60, bottom: 60, left: 108, right: 108 },
        children: [new Paragraph({ alignment: align, children })],
    });
}

/** Sender block on the left, invoice meta on the right, both borderless. */
function letterHead(invoiceDate) {
    const meta = [
        [__("Invoice number", "soli-event"), BLANK],
        [__("Invoice date", "soli-event"), invoiceDate.format("D MMMM YYYY")],
        [
            __("Due date", "soli-event"),
            invoiceDate.add(PAYMENT_TERM_DAYS, "day").format("D MMMM YYYY"),
        ],
    ];

    return new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [5138, 4500],
        borders: NO_BORDERS,
        rows: [
            new TableRow({
                children: [
                    cell(
                        [
                            line(SENDER.name, { bold: true }),
                            ...SENDER.lines.map((text) => line(text)),
                        ],
                        { width: 5138, verticalAlign: VerticalAlign.TOP }
                    ),
                    cell(
                        meta.map(
                            ([label, value]) =>
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: `${label}: `, bold: true }),
                                        new TextRun(value),
                                    ],
                                })
                        ),
                        { width: 4500, verticalAlign: VerticalAlign.TOP }
                    ),
                ],
            }),
        ],
    });
}

/**
 * One table holds the lines *and* the totals, because only same-table cell
 * references (=D2*E7) recalculate reliably - Word's SUM(ABOVE) and bookmark
 * references silently evaluate to 0 in other word processors. For the same
 * reason every referenced cell holds a bare number: a "€" in the cell makes it
 * unparseable, so the currency lives in the column header instead.
 */
function invoiceTable(dates, hourlyRate, vatPercentage) {
    const header = new TableRow({
        tableHeader: true,
        children: [
            cell(__("Date", "soli-event"), { width: LINE_COLUMNS[0], bold: true, shading: HEADER_FILL }),
            cell(__("From", "soli-event"), { width: LINE_COLUMNS[1], bold: true, shading: HEADER_FILL }),
            cell(__("Until", "soli-event"), { width: LINE_COLUMNS[2], bold: true, shading: HEADER_FILL }),
            cell(__("Hours", "soli-event"), {
                width: LINE_COLUMNS[3],
                bold: true,
                shading: HEADER_FILL,
                align: AlignmentType.RIGHT,
            }),
            cell(__("Amount (€)", "soli-event"), {
                width: LINE_COLUMNS[4],
                bold: true,
                shading: HEADER_FILL,
                align: AlignmentType.RIGHT,
            }),
        ],
    });

    // Row 1 is the header, so the dates occupy rows 2..N+1 and the summary rows
    // follow underneath - all addressed by their 1-based row number.
    const firstDateRow = 2;
    const lastDateRow = dates.length + 1;
    const rowOf = {
        totalHours: lastDateRow + 1,
        rate: lastDateRow + 2,
        subtotal: lastDateRow + 3,
        vatRate: lastDateRow + 4,
        vat: lastDateRow + 5,
    };

    // Reused by subtotal, VAT and total so none of them has to reference a
    // cell that holds a field - only plain numbers are ever read.
    const SUBTOTAL_EXPR = `SUM(D${firstDateRow}:D${lastDateRow})*E${rowOf.rate}`;

    const totalHours = dates.reduce((sum, date) => sum + durationInHours(date), 0);
    const subtotal = totalHours * hourlyRate;
    const vat = (subtotal * vatPercentage) / 100;

    const dateRows = dates.map((date, index) => {
        const start = dayjs(date.startDate).locale("nl");
        const end = dayjs(date.endDate).locale("nl");
        const sameDay = start.isSame(end, "day");
        const hours = durationInHours(date);
        return new TableRow({
            children: [
                cell(start.format("dddd D MMMM YYYY"), { width: LINE_COLUMNS[0] }),
                cell(start.format("HH:mm"), { width: LINE_COLUMNS[1] }),
                cell(sameDay ? end.format("HH:mm") : end.format("D MMM HH:mm"), { width: LINE_COLUMNS[2] }),
                cell(formatHours(hours), { width: LINE_COLUMNS[3], align: AlignmentType.RIGHT }),
                fieldCell(
                    [
                        new SimpleField(
                            `=D${firstDateRow + index}*E${rowOf.rate} \\# "#.##0,00"`,
                            nlNumber.format(hours * hourlyRate)
                        ),
                    ],
                    { width: LINE_COLUMNS[4] }
                ),
            ],
        });
    });

    // Every summary row keeps all five cells: merging them would renumber the
    // row for formula purposes, so the value would no longer be addressable as
    // column E. The label sits in column A, the value stays in column E.
    const summaryRow = (label, valueChildren, { bold = false, shading } = {}) =>
        new TableRow({
            children: [
                cell(label, {
                    width: LINE_COLUMNS[0],
                    bold,
                    shading,
                    align: AlignmentType.RIGHT,
                }),
                cell("", { width: LINE_COLUMNS[1], shading }),
                cell("", { width: LINE_COLUMNS[2], shading }),
                cell("", { width: LINE_COLUMNS[3], shading }),
                fieldCell(valueChildren, { width: LINE_COLUMNS[4], shading, bold }),
            ],
        });

    return new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: LINE_COLUMNS,
        rows: [
            header,
            ...dateRows,
            summaryRow(__("Total hours", "soli-event"), [
                new SimpleField(
                    `=SUM(D${firstDateRow}:D${lastDateRow}) \\# "0,00"`,
                    formatHours(totalHours)
                ),
            ]),
            summaryRow(__("Hourly rate (€)", "soli-event"), [
                new TextRun(nlNumber.format(hourlyRate)),
            ]),
            summaryRow(__("Subtotal (€)", "soli-event"), [
                new SimpleField(`=${SUBTOTAL_EXPR} \\# "#.##0,00"`, nlNumber.format(subtotal)),
            ]),
            summaryRow(__("VAT percentage", "soli-event"), [
                new TextRun(nlNumber.format(vatPercentage)),
            ]),
            summaryRow(__("VAT (€)", "soli-event"), [
                new SimpleField(
                    `=${SUBTOTAL_EXPR}*E${rowOf.vatRate}/100 \\# "#.##0,00"`,
                    nlNumber.format(vat)
                ),
            ]),
            summaryRow(
                __("Total (€)", "soli-event"),
                [
                    new SimpleField(
                        `=${SUBTOTAL_EXPR}*(1+E${rowOf.vatRate}/100) \\# "#.##0,00"`,
                        nlNumber.format(subtotal + vat)
                    ),
                ],
                { bold: true, shading: HEADER_FILL }
            ),
        ],
    });
}

export function generateInvoiceDocx({ title, dates, hourlyRate, vatPercentage = 0 }) {
    const sorted = [...dates].sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf());
    const invoiceDate = dayjs().locale("nl");

    const doc = new Document({
        creator: SENDER.name,
        title: `${__("Invoice", "soli-event")} - ${title}`,
        // Word parses the numbers inside the formula fields by run language, so
        // pin it: with an English default, "50,00" would recalculate as 5000.
        styles: {
            default: {
                document: {
                    run: { language: { value: "nl-NL" }, size: 20 },
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: {
                            top: PAGE_MARGIN,
                            bottom: PAGE_MARGIN,
                            left: PAGE_MARGIN,
                            right: PAGE_MARGIN,
                        },
                    },
                },
                children: [
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        children: [new TextRun(__("Invoice", "soli-event"))],
                    }),
                    letterHead(invoiceDate),
                    new Paragraph({}),
                    line(__("To", "soli-event"), { bold: true }),
                    line(BLANK),
                    line(BLANK),
                    line(BLANK),
                    new Paragraph({}),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `${__("Subject", "soli-event")}: `, bold: true }),
                            new TextRun(title),
                        ],
                    }),
                    new Paragraph({}),
                    invoiceTable(sorted, hourlyRate, vatPercentage),
                    new Paragraph({}),
                    line(
                        sprintf(
                            /* translators: %d: number of days */
                            __(
                                "Please pay within %d days, quoting the invoice number, to IBAN",
                                "soli-event"
                            ),
                            PAYMENT_TERM_DAYS
                        ) + ` ${BLANK} ${__("in the name of", "soli-event")} ${SENDER.name}.`
                    ),
                    line(
                        `${__("Chamber of Commerce", "soli-event")} ${BLANK}   ` +
                            `${__("VAT number", "soli-event")} ${BLANK}`
                    ),
                    new Paragraph({}),
                    new Paragraph({
                        children: [
                            new TextRun({
                                italics: true,
                                text: __(
                                    "Tip: change the hourly rate or the VAT percentage in the table, then select everything (Ctrl+A) and press F9 to recalculate all amounts.",
                                    "soli-event"
                                ),
                            }),
                        ],
                    }),
                ],
            },
        ],
    });

    return Packer.toBlob(doc);
}
