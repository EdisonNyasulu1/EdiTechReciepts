import { test } from "node:test";
import assert from "node:assert/strict";
import { calcQuotation, docNumber, recordToDoc, toTransactionPayload } from "./documents.js";

const items = [
  { description: "Company Logo", qty: "1", unitPrice: "20000" },
  { description: "Business Cards", qty: "2", unitPrice: "10000" },
  { description: "", qty: "1", unitPrice: "" }, // blank row is ignored
];

test("calcQuotation totals", () => {
  const t = calcQuotation(items, "amount", "", "");
  assert.equal(t.lines.length, 2);
  assert.equal(t.subTotal, 40000);
  assert.equal(t.discountAmount, 0);
  assert.equal(t.taxAmount, 0);
  assert.equal(t.grandTotal, 40000);
});

test("calcQuotation: fixed discount and tax", () => {
  const t = calcQuotation(items, "amount", "4000", "16.5");
  assert.equal(t.discountAmount, 4000);
  assert.equal(t.taxAmount, 5940); // 16.5% of 36,000
  assert.equal(t.grandTotal, 41940);
});

test("calcQuotation: percentage discount", () => {
  const t = calcQuotation(items, "percent", "10", "0");
  assert.equal(t.discountAmount, 4000);
  assert.equal(t.grandTotal, 36000);
});

test("calcQuotation never lets the discount exceed the sub total", () => {
  assert.equal(calcQuotation(items, "amount", "999999", "").grandTotal, 0);
  assert.equal(calcQuotation(items, "percent", "250", "").grandTotal, 0);
});

test("calcQuotation ignores nonsense and negative numbers", () => {
  const t = calcQuotation(items, "amount", "-500", "abc");
  assert.equal(t.discountAmount, 0);
  assert.equal(t.taxAmount, 0);
  assert.equal(calcQuotation([], "amount", "", "").grandTotal, 0);
});

test("calcQuotation handles decimal quantities and rounds to 2 places", () => {
  const t = calcQuotation([{ description: "Banner (m)", qty: "2.5", unitPrice: "3333.33" }], "amount", "", "");
  assert.equal(t.lines[0].total, 8333.33);
});

const quote = {
  docType: "Quotation",
  data: {
    quoteNo: "QT-007", quoteDate: "12 August 2026", customerName: "Mercy Banda",
    discountType: "percent", discountValue: 10, discountAmount: 4000, grandTotal: 36000,
  },
};
const receipt = {
  docType: "Receipt",
  data: { receiptNo: "1024", date: "12 August 2026", customerName: "Mercy Banda", amountFigures: "MWK 10,000", discount: "" },
};

test("toTransactionPayload - quotation", () => {
  const p = toTransactionPayload(quote);
  assert.equal(p.receiptNo, "QT-007");
  assert.equal(p.docType, "Quotation");
  assert.equal(p.amount, 36000);
  assert.equal(p.rawAmount, "MWK 36,000");
  assert.equal(p.discount, "10% (MWK 4,000)");
  assert.equal(p.details, quote.data);
});

test("toTransactionPayload - receipt", () => {
  const p = toTransactionPayload(receipt);
  assert.equal(p.receiptNo, "1024");
  assert.equal(p.amount, 10000);
  assert.equal(p.rawAmount, "MWK 10,000");
  assert.equal(p.discount, "None");
});

test("docNumber and recordToDoc", () => {
  assert.equal(docNumber(quote), "QT-007");
  assert.equal(docNumber(receipt), "1024");
  assert.deepEqual(recordToDoc({ docType: "Receipt", details: receipt.data }), { docType: "Receipt", data: receipt.data });
  assert.equal(recordToDoc({ docType: "Receipt", details: null }), null);
  assert.equal(recordToDoc(undefined), null);
});
