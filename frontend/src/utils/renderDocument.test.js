// Runs the real drawing code against a fake canvas that records every piece of text drawn.
import { test, before } from "node:test";
import assert from "node:assert/strict";

let drawn;
let rects;
let canvas;
let renderDocument;

before(async () => {
  globalThis.document = { fonts: { load: async () => {} } };
  globalThis.Image = class {
    set src(_) {
      queueMicrotask(() => this.onload());
    }
  };
  const size = (font) => parseFloat(/(\d+(\.\d+)?)px/.exec(font)[1]);
  const ctx = {
    font: "", fillStyle: "", textAlign: "", textBaseline: "",
    setTransform() {}, drawImage() {},
    fillRect: (...a) => rects.push(a),
    measureText(t) { return { width: t.length * size(this.font) * 0.56 }; }, // rough Poppins width
    fillText(text, x, y, maxWidth) {
      drawn.push({ text, x, y, maxWidth, width: text.length * size(this.font) * 0.56, align: this.textAlign });
    },
  };
  canvas = { getContext: () => ctx };
  ({ renderDocument } = await import("./renderDocument.js"));
});

const reset = () => { drawn = []; rects = []; };
const find = (text) => drawn.find((d) => d.text === text);

const quote = {
  docType: "Quotation",
  data: {
    quoteNo: "QT-007", quoteDate: "12 August 2026", dueDate: "26 August 2026", preparedBy: "Edison Nyasulu",
    customerName: "Mercy Banda Enterprises", customerPhone: "0999 123 456",
    items: [
      { description: "Company Logo Design", qty: 1, unitPrice: 20000, total: 20000 },
      { description: "Full corporate branding package including logo, business cards, letterhead, envelopes and social media kit templates for launch", qty: 2.5, unitPrice: 1250000, total: 3125000 },
    ],
    subTotal: 3145000, discountAmount: 0, taxAmount: 517000, grandTotal: 3662000,
    amountWords: "Three Million Six Hundred and Sixty-Two Thousand Kwacha Only",
  },
};

test("quotation: canvas is high resolution and portrait", async () => {
  reset();
  await renderDocument(canvas, quote);
  assert.equal(canvas.width, 2772);
  assert.equal(canvas.height, 3014);
});

test("quotation: every field is drawn in the right place", async () => {
  reset();
  await renderDocument(canvas, quote);
  assert.equal(find("QT-007").y, 275);
  assert.equal(find("12 August 2026").x, 1402);
  assert.equal(find("Mercy Banda Enterprises").x, 478);
  assert.equal(find("0999 123 456").x, 1378);
  const logo = find("Company Logo Design");
  assert.equal(logo.y, 861); // first table row
  assert.equal(drawn.find((d) => d.text === "20,000" && d.align === "right" && d.x === 1738).y, 861);
  assert.equal(find("MWK 3,145,000").y, 1377); // sub total
  assert.equal(find("None").y, 1448); // no discount
  assert.equal(find("MWK 517,000").y, 1520); // tax
  assert.equal(find("MWK 3,662,000").y, 1590); // grand total
});

test("quotation: nothing runs past its box", async () => {
  reset();
  await renderDocument(canvas, quote);
  for (const d of drawn) {
    if (d.maxWidth) assert.ok(d.width <= d.maxWidth + 0.5, `"${d.text}" is ${Math.round(d.width)}px wide, box is ${d.maxWidth}px`);
  }
});

test("quotation: a long description wraps onto two lines inside its row", async () => {
  reset();
  await renderDocument(canvas, quote);
  const lines = drawn.filter((d) => d.x === 120 && d.y > 956 - 40 && d.y < 956 + 40);
  assert.equal(lines.length, 2);
  assert.ok(lines[0].y < 956 && lines[1].y > 956);
  assert.ok(lines[1].text.endsWith("…") || lines.join(" ").length > 0);
});

test("quotation: amount in words continues on the second line", async () => {
  reset();
  await renderDocument(canvas, quote);
  const line1 = drawn.find((d) => d.y === 1670);
  const line2 = drawn.find((d) => d.y === 1742);
  assert.ok(line1 && line2);
  assert.equal(`${line1.text} ${line2.text}`, quote.data.amountWords);
});

test("quotation: only five rows exist on the template", async () => {
  reset();
  const many = { ...quote, data: { ...quote.data, items: Array.from({ length: 8 }, (_, i) => ({ description: `Item ${i + 1}`, qty: 1, unitPrice: 100, total: 100 })) } };
  await renderDocument(canvas, many);
  assert.ok(find("Item 5"));
  assert.equal(find("Item 6"), undefined);
});

const receipt = {
  docType: "Receipt",
  data: {
    receiptNo: "1024", date: "12 August 2026", customerName: "Mercy Banda", amountFigures: "MWK 10,000", discount: "",
    amountWords: "Ten Thousand Kwacha Only", purpose: "Poster / Flyer", quantity: "1", accountNo: "088556688", time: "11:30 AM", receivedBy: "Edison Nyasulu",
  },
};

test("receipt: high resolution, no title swap", async () => {
  reset();
  await renderDocument(canvas, receipt);
  assert.equal(canvas.width, 2208);
  assert.equal(canvas.height, 1380);
  assert.equal(rects.length, 0);
  assert.equal(find("INVOICE"), undefined);
  assert.equal(find("1024").x, 138);
  assert.equal(find("None").x, 465); // empty discount prints "None"
});

test("invoice: covers 'CASH RECEIPT' and writes INVOICE", async () => {
  reset();
  await renderDocument(canvas, { ...receipt, docType: "Invoice" });
  assert.equal(rects.length, 1);
  const title = find("INVOICE");
  assert.ok(title);
  assert.equal(title.align, "center");
});

test("a very long customer name is squeezed into its box instead of running off the line", async () => {
  reset();
  await renderDocument(canvas, { ...receipt, data: { ...receipt.data, customerName: "Very long company name ".repeat(8).trim() } });
  const d = drawn.find((x) => x.x === 140 && x.y === 192);
  assert.equal(d.maxWidth, 535); // the canvas is told to squeeze the text into the available width
});
