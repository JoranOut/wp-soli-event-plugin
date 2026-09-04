import {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
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
// OMSCHRIJVING | AANTAL | PRIJS | BTW | BEDRAG - explicit twips, because a
// percentage width serialises as w:w="100%" and Word collapses the table.
const LINE_COLUMNS = [4038, 1200, 1400, 1000, 2000];

// Palette: magenta accent, slate body text, muted labels, lighter placeholders.
const ACCENT = "EC008C";
const BODY = "3F4A5A";
const MUTED = "8A94A6";
const PLACEHOLDER = "AEB6C4";
const HAIRLINE = "D8DCE4";

// Nunito is the design's typeface, but a font Word cannot find is silently
// substituted, and Nunito is not installed with Office on either platform.
// Trebuchet MS ships with Office everywhere and is the nearest humanist sans
// that actually renders.
const FONT = "Trebuchet MS";

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = {
    top: NO_BORDER,
    bottom: NO_BORDER,
    left: NO_BORDER,
    right: NO_BORDER,
    insideHorizontal: NO_BORDER,
    insideVertical: NO_BORDER,
};
const ACCENT_RULE = { style: BorderStyle.SINGLE, size: 16, color: ACCENT }; // 2pt
const HAIRLINE_RULE = { style: BorderStyle.SINGLE, size: 2, color: HAIRLINE };
const CELL_PLAIN = { top: NO_BORDER, left: NO_BORDER, right: NO_BORDER, bottom: NO_BORDER };
const CELL_BODY = { top: NO_BORDER, left: NO_BORDER, right: NO_BORDER, bottom: HAIRLINE_RULE };
const CELL_TOP_RULE = { top: ACCENT_RULE, left: NO_BORDER, right: NO_BORDER, bottom: NO_BORDER };
const CELL_HEADER = { top: NO_BORDER, left: NO_BORDER, right: NO_BORDER, bottom: ACCENT_RULE };

const nlNumber = new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
// Percentages read as "21", not "21,00" - still a bare number, so the VAT and
// total formulas keep parsing it.
const nlPercent = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 });

// Measured between whole minutes: stored dates can carry stray seconds, which
// would otherwise turn a clean 12:00-14:30 into 2,48 hours on the invoice.
// The VAT rates a Dutch invoice can carry: 0% (exempt / reverse charge), the
// 9% reduced rate and the 21% standard rate. Exported so the dialog and the
// document cannot drift apart.
export const VAT_PERCENTAGES = [0, 9, 21];
export const DEFAULT_VAT_PERCENTAGE = 21;

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
    return ["factuur", slug || "event", dayjs().format("YYYY-MM-DD")].join("-") + ".docx";
}

function line(text, { color = BODY, alignment, ...rest } = {}) {
    return new Paragraph({
        alignment,
        children: [new TextRun({ text, color, ...rest })],
    });
}

/** Small uppercase, letter-spaced label: "AAN", "VAN", the column headers. */
function label(text, { alignment, color = MUTED } = {}) {
    return new Paragraph({
        alignment,
        spacing: { after: 60 },
        children: [
            new TextRun({
                text,
                bold: true,
                allCaps: true,
                size: 15,
                characterSpacing: 30,
                color,
            }),
        ],
    });
}

function cell(children, { width, borders, verticalAlign, margins } = {}) {
    return new TableCell({
        verticalAlign: verticalAlign ?? VerticalAlign.CENTER,
        width: width ? { size: width, type: WidthType.DXA } : undefined,
        borders,
        margins: margins ?? { top: 90, bottom: 90, left: 0, right: 108 },
        children: Array.isArray(children) ? children : [children],
    });
}

function textCell(text, { width, align, color = BODY, bold = false, borders, size } = {}) {
    return cell(
        new Paragraph({
            alignment: align,
            children: [new TextRun({ text, color, bold, size })],
        }),
        { width, borders }
    );
}

/** --------------------------------------------------------------- header */

/**
 * "Factuur" left, logo right. There is no Soli logo asset anywhere in this
 * repository, so the right-hand cell is deliberately left empty rather than
 * filled with an invented mark; drop the image in here when one exists.
 */
function headerBlock() {
    return new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [5638, 4000],
        borders: NO_BORDERS,
        rows: [
            new TableRow({
                children: [
                    cell(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Factuur",
                                    bold: true,
                                    size: 60, // 30pt
                                    color: ACCENT,
                                }),
                            ],
                        }),
                        { width: 5638, verticalAlign: VerticalAlign.TOP }
                    ),
                    cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [] }), {
                        width: 4000,
                        verticalAlign: VerticalAlign.TOP,
                    }),
                ],
            }),
        ],
    });
}

/** AAN (placeholder recipient) left, VAN (sender) right. */
function addressBlock() {
    // The repo does not know the recipient, so these stay placeholders rather
    // than invented details - same principle as the blank IBAN/KvK/VAT lines.
    const recipient = [
        "Naam",
        "Straat huisnummer",
        "Postcode + plaatsnaam",
    ];

    const sender = [
        SENDER.name,
        ...SENDER.lines,
        `KvK ${BLANK} · Btw ${BLANK}`,
        `IBAN ${BLANK}`,
    ];

    return new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [4819, 4819],
        borders: NO_BORDERS,
        rows: [
            new TableRow({
                children: [
                    cell(
                        [
                            label("AAN"),
                            ...recipient.map((text) => line(text, { color: PLACEHOLDER })),
                        ],
                        { width: 4819, verticalAlign: VerticalAlign.TOP }
                    ),
                    cell(
                        [
                            label("VAN", { alignment: AlignmentType.RIGHT }),
                            ...sender.map((text) => line(text, { alignment: AlignmentType.RIGHT })),
                        ],
                        { width: 4819, verticalAlign: VerticalAlign.TOP }
                    ),
                ],
            }),
        ],
    });
}

/** Factuurnummer / Datum / Vervaldatum: bold label, lighter value, aligned. */
function metaBlock(invoiceDate) {
    const rows = [
        ["Factuurnummer", BLANK],
        ["Datum", invoiceDate.format("D-M-YYYY")],
        [
            "Vervaldatum",
            invoiceDate.add(PAYMENT_TERM_DAYS, "day").format("D-M-YYYY"),
        ],
    ];

    return new Table({
        width: { size: 5000, type: WidthType.DXA },
        columnWidths: [2400, 2600],
        borders: NO_BORDERS,
        rows: rows.map(
            ([name, value]) =>
                new TableRow({
                    children: [
                        cell(
                            new Paragraph({
                                children: [new TextRun({ text: name, color: BODY, bold: true })],
                            }),
                            { width: 2400, borders: CELL_PLAIN, margins: { top: 30, bottom: 30, left: 0, right: 108 } }
                        ),
                        cell(
                            new Paragraph({
                                children: [new TextRun({ text: value, color: MUTED })],
                            }),
                            { width: 2600, borders: CELL_PLAIN, margins: { top: 30, bottom: 30, left: 0, right: 108 } }
                        ),
                    ],
                })
        ),
    });
}

/** ---------------------------------------------------------------- table */

/**
 * Lines and totals live in ONE table, because only same-table cell references
 * (=B2*C2) recalculate reliably - SUM(ABOVE) and bookmark references silently
 * evaluate to 0 outside Word. Three rules follow, all learned by rendering:
 *
 * - No merged cells. Merging renumbers a row for formula purposes and the value
 *   cell stops being addressable, so every totals row keeps all five cells even
 *   though the design shows the label floating to the right of an empty span.
 * - Referenced cells hold a bare number. AANTAL, PRIJS and BTW are read by the
 *   formulas, so their unit lives in the column header; only the BEDRAG cells
 *   and the totals - which nothing references - carry a "€".
 * - The totals never reference a cell that itself holds a field, so they are
 *   rebuilt from the hours and price cells.
 */
function invoiceTable(title, dates, hourlyRate, vatPercentage) {
    const headerCell = (text, align) =>
        new TableCell({
            verticalAlign: VerticalAlign.BOTTOM,
            borders: CELL_HEADER,
            margins: { top: 60, bottom: 90, left: 0, right: 108 },
            children: [label(text, { alignment: align })],
        });

    const header = new TableRow({
        tableHeader: true,
        children: [
            headerCell("OMSCHRIJVING"),
            headerCell("AANTAL", AlignmentType.RIGHT),
            headerCell("PRIJS (€)", AlignmentType.RIGHT),
            headerCell("BTW (%)", AlignmentType.RIGHT),
            headerCell("BEDRAG (EXCL. BTW)", AlignmentType.RIGHT),
        ],
    });

    // Row 1 is the header, so the dates occupy rows 2..N+1.
    const firstDateRow = 2;

    const totalHours = dates.reduce((sum, date) => sum + durationInHours(date), 0);
    const subtotal = totalHours * hourlyRate;
    const vat = (subtotal * vatPercentage) / 100;

    const SUBTOTAL_EXPR = dates
        .map((_, index) => `B${firstDateRow + index}*C${firstDateRow + index}`)
        .join("+");
    const VAT_CELL = `D${firstDateRow}`;

    const dateRows = dates.map((date, index) => {
        const row = firstDateRow + index;
        const start = dayjs(date.startDate).locale("nl");
        const end = dayjs(date.endDate).locale("nl");
        const sameDay = start.isSame(end, "day");
        const hours = durationInHours(date);
        const when =
            `${start.format("dddd D MMMM YYYY")} · ${start.format("HH:mm")}-` +
            (sameDay ? end.format("HH:mm") : end.format("D MMM HH:mm"));

        return new TableRow({
            children: [
                cell(
                    [
                        new Paragraph({ children: [new TextRun({ text: title, color: BODY })] }),
                        new Paragraph({
                            children: [new TextRun({ text: when, color: MUTED, size: 17 })],
                        }),
                    ],
                    { width: LINE_COLUMNS[0], borders: CELL_BODY }
                ),
                textCell(formatHours(hours), {
                    width: LINE_COLUMNS[1],
                    align: AlignmentType.RIGHT,
                    borders: CELL_BODY,
                }),
                textCell(nlNumber.format(hourlyRate), {
                    width: LINE_COLUMNS[2],
                    align: AlignmentType.RIGHT,
                    borders: CELL_BODY,
                }),
                // Accent-coloured as in the design, but a bare number: the VAT
                // and total rows read this cell, and a "%" makes it unparseable.
                textCell(nlPercent.format(vatPercentage), {
                    width: LINE_COLUMNS[3],
                    align: AlignmentType.RIGHT,
                    color: ACCENT,
                    borders: CELL_BODY,
                }),
                cell(
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new SimpleField(
                                `=B${row}*C${row} \\# "€ #.##0,00"`,
                                `€ ${nlNumber.format(hours * hourlyRate)}`
                            ),
                        ],
                    }),
                    { width: LINE_COLUMNS[4], borders: CELL_BODY }
                ),
            ],
        });
    });

    // Totals bottom-right. The three leading cells stay in place (unmerged) and
    // simply carry no borders, which reads as the design's floating block.
    const totalsRow = (name, valueChildren, { bold = false, rule = false } = {}) => {
        const borders = rule ? CELL_TOP_RULE : CELL_PLAIN;
        const blank = () =>
            cell(new Paragraph({ children: [] }), { borders: CELL_PLAIN, width: undefined });
        return new TableRow({
            children: [
                blank(),
                blank(),
                blank(),
                cell(
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: name, color: BODY, bold, size: bold ? 22 : 20 }),
                        ],
                    }),
                    { width: LINE_COLUMNS[3], borders }
                ),
                cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: valueChildren }), {
                    width: LINE_COLUMNS[4],
                    borders,
                }),
            ],
        });
    };

    // docx's SimpleField takes no run options, so the amounts keep the document
    // default weight; only the "Totaal" label can be emphasised.
    const money = (expression, cached) => [
        new SimpleField(`=${expression} \\# "€ #.##0,00"`, `€ ${nlNumber.format(cached)}`),
    ];

    return new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: LINE_COLUMNS,
        borders: NO_BORDERS,
        rows: [
            header,
            ...dateRows,
            totalsRow("Subtotaal", money(SUBTOTAL_EXPR, subtotal)),
            totalsRow(
                `Btw ${nlPercent.format(vatPercentage)}%`,
                money(`(${SUBTOTAL_EXPR})*${VAT_CELL}/100`, vat)
            ),
            totalsRow(
                "Totaal",
                money(`(${SUBTOTAL_EXPR})*(1+${VAT_CELL}/100)`, subtotal + vat),
                { bold: true, rule: true }
            ),
        ],
    });
}

export function generateInvoiceDocx({ title, dates, hourlyRate, vatPercentage = DEFAULT_VAT_PERCENTAGE }) {
    const sorted = [...dates].sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf());
    const invoiceDate = dayjs().locale("nl");

    const doc = new Document({
        creator: SENDER.name,
        title: `Factuur - ${title}`,
        // Word parses the numbers inside the formula fields by run language, so
        // pin it: with an English default, "50,00" would recalculate as 5000.
        styles: {
            default: {
                document: {
                    run: {
                        language: { value: "nl-NL" },
                        size: 20,
                        font: FONT,
                        color: BODY,
                    },
                    paragraph: { spacing: { line: 280 } },
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
                    headerBlock(),
                    new Paragraph({ spacing: { after: 240 }, children: [] }),
                    addressBlock(),
                    new Paragraph({ spacing: { after: 240 }, children: [] }),
                    metaBlock(invoiceDate),
                    new Paragraph({ spacing: { after: 360 }, children: [] }),
                    invoiceTable(title, sorted, hourlyRate, vatPercentage),
                    new Paragraph({ spacing: { after: 240 }, children: [] }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                italics: true,
                                size: 17,
                                color: MUTED,
                                text:
                                    "Tip: pas de prijs of het btw-percentage in de tabel aan, selecteer daarna alles (Ctrl+A) en druk op F9 om alle bedragen opnieuw te berekenen.",
                            }),
                        ],
                    }),
                ],
            },
        ],
    });

    return Packer.toBlob(doc);
}
