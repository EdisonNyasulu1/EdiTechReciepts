import { mwk, parseMoney, roundMoney } from "./format.js";

export const MAX_QUOTE_ITEMS = 5; // the quotation template has 5 rows
export const MAX_AMOUNT = 9_999_999_999; // NUMERIC(12,2) limit in the database

/**
 * Work out every figure on a quotation.
 * items: [{ description, qty, unitPrice }] (strings or numbers)
 * Only rows that have a description or a price are counted.
 */
export function calcQuotation(items, discountType, discountValue, taxPercent) {
  const lines = (items || [])
    .filter((it) => String(it.description ?? "").trim() || String(it.unitPrice ?? "").trim())
    .map((it) => {
      const qty = parseFloat(it.qty) || 0;
      const unitPrice = parseFloat(it.unitPrice) || 0;
      return {
        description: String(it.description ?? "").trim(),
        qty,
        unitPrice,
        total: roundMoney(qty * unitPrice),
      };
    });

  const subTotal = roundMoney(lines.reduce((sum, l) => sum + l.total, 0));
  const dv = Math.max(parseFloat(discountValue) || 0, 0);
  const discountAmount = roundMoney(
    discountType === "percent" ? (subTotal * Math.min(dv, 100)) / 100 : Math.min(dv, subTotal)
  );
  const taxable = subTotal - discountAmount;
  const taxAmount = roundMoney((taxable * Math.min(Math.max(parseFloat(taxPercent) || 0, 0), 100)) / 100);
  const grandTotal = roundMoney(taxable + taxAmount);

  return { lines, subTotal, discountAmount, taxAmount, grandTotal };
}

export const docNumber = (doc) => (doc.docType === "Quotation" ? doc.data.quoteNo : doc.data.receiptNo);

function describeDiscount(d) {
  if (!d.discountAmount) return "None";
  return d.discountType === "percent" ? `${d.discountValue}% (${mwk(d.discountAmount)})` : mwk(d.discountAmount);
}

/** Turn a generated document into the payload the API stores. */
export function toTransactionPayload(doc) {
  const { docType, data } = doc;

  if (docType === "Quotation") {
    return {
      receiptNo: data.quoteNo,
      docType,
      date: data.quoteDate,
      customerName: data.customerName,
      discount: describeDiscount(data),
      amount: data.grandTotal,
      rawAmount: mwk(data.grandTotal),
      details: data,
    };
  }

  return {
    receiptNo: data.receiptNo,
    docType,
    date: data.date,
    customerName: data.customerName,
    discount: data.discount?.trim() || "None",
    amount: parseMoney(data.amountFigures),
    rawAmount: data.amountFigures,
    details: data,
  };
}

/** Re-open a saved record. Records saved before details were stored have none. */
export function recordToDoc(record) {
  return record?.details ? { docType: record.docType, data: record.details } : null;
}
