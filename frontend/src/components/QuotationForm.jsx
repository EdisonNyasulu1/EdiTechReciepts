import React, { useMemo, useState } from "react";
import { PRESETS, presetLabel } from "../data/presets.js";
import { addDaysISO, amountToWords, formatDateLong, mwk, nextDocNumber, todayISO } from "../utils/format.js";
import { calcQuotation, MAX_AMOUNT, MAX_QUOTE_ITEMS } from "../utils/documents.js";
import "../styles/documents.css";

const blankItem = () => ({ description: "", qty: "1", unitPrice: "" });
const isBlank = (it) => !it.description.trim() && !String(it.unitPrice).trim();

export default function QuotationForm({ user, revenueData, onPreview }) {
  const [form, setForm] = useState(() => {
    const today = todayISO();
    return {
      quoteNo: nextDocNumber(revenueData, "Quotation"),
      quoteDate: today,
      dueDate: addDaysISO(today, 14),
      preparedBy: user?.full_name || "",
      customerName: "",
      customerPhone: "",
      discountType: "amount", // "amount" | "percent"
      discountValue: "",
      taxPercent: "",
    };
  });
  const [dueEdited, setDueEdited] = useState(false);
  const [items, setItems] = useState([blankItem()]);
  const [error, setError] = useState("");

  const totals = useMemo(
    () => calcQuotation(items, form.discountType, form.discountValue, form.taxPercent),
    [items, form.discountType, form.discountValue, form.taxPercent]
  );

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function handleQuoteDate(e) {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, quoteDate: value, dueDate: dueEdited ? prev.dueDate : addDaysISO(value, 14) }));
  }

  function handleDueDate(e) {
    setDueEdited(true);
    setForm((prev) => ({ ...prev, dueDate: e.target.value }));
  }

  const updateItem = (i, field) => (e) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: e.target.value } : it)));

  function addItem(item = blankItem()) {
    setItems((prev) => {
      if (prev.length && isBlank(prev[prev.length - 1])) return [...prev.slice(0, -1), item]; // fill the empty last row
      if (prev.length >= MAX_QUOTE_ITEMS) return prev;
      return [...prev, item];
    });
  }

  function addFromRateCard(e) {
    const idx = e.target.value;
    e.target.value = "";
    if (idx === "") return;
    if (items.length >= MAX_QUOTE_ITEMS && !isBlank(items[items.length - 1])) {
      setError(`The quotation template has room for ${MAX_QUOTE_ITEMS} items.`);
      return;
    }
    setError("");
    const p = PRESETS[Number(idx)];
    addItem({ description: p.purpose, qty: "1", unitPrice: String(p.price) });
  }

  const removeItem = (i) => setItems((prev) => (prev.length === 1 ? [blankItem()] : prev.filter((_, idx) => idx !== i)));

  function handlePreview() {
    if (!form.quoteNo.trim()) return setError("Please enter the quotation number.");
    if (!form.quoteDate) return setError("Please choose the quote date.");
    if (!form.customerName.trim()) return setError("Please enter the customer name.");

    if (!totals.lines.length) return setError("Add at least one item to quote.");
    const badLine = totals.lines.findIndex((l) => !l.description || !(l.unitPrice > 0) || !(l.qty > 0));
    if (badLine >= 0) return setError(`Item ${badLine + 1}: enter a description, a quantity and a price above zero.`);
    if (totals.grandTotal <= 0 || totals.grandTotal > MAX_AMOUNT) return setError("The grand total must be between 0 and MWK 9,999,999,999.");
    if (form.discountType === "percent" && parseFloat(form.discountValue) > 100) return setError("A percentage discount cannot be more than 100%.");

    setError("");
    onPreview({
      docType: "Quotation",
      data: {
        quoteNo: form.quoteNo.trim(),
        quoteDate: formatDateLong(form.quoteDate),
        dueDate: formatDateLong(form.dueDate),
        preparedBy: form.preparedBy.trim(),
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        items: totals.lines,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue) || 0,
        taxPercent: parseFloat(form.taxPercent) || 0,
        subTotal: totals.subTotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        amountWords: amountToWords(totals.grandTotal),
      },
    });
  }

  return (
    <>
      <h2>Generate Quotation</h2>
      <p>Prepare a price quote for a client. Up to {MAX_QUOTE_ITEMS} items fit on the template.</p>

      <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
        <div className="form-group">
          <label htmlFor="quoteNo">Quotation No:</label>
          <input id="quoteNo" value={form.quoteNo} onChange={set("quoteNo")} placeholder="e.g. QT-001" />
        </div>
        <div className="form-group">
          <label htmlFor="quoteDate">Quote Date:</label>
          <input id="quoteDate" type="date" value={form.quoteDate} onChange={handleQuoteDate} />
        </div>

        <div className="form-group">
          <label htmlFor="preparedBy">Prepared By:</label>
          <input id="preparedBy" value={form.preparedBy} onChange={set("preparedBy")} />
        </div>
        <div className="form-group">
          <label htmlFor="dueDate">Due Date (valid until):</label>
          <input id="dueDate" type="date" value={form.dueDate} onChange={handleDueDate} />
        </div>

        <div className="form-group">
          <label htmlFor="customerName">Customer Name:</label>
          <input id="customerName" value={form.customerName} onChange={set("customerName")} placeholder="Client or Company Name" />
        </div>
        <div className="form-group">
          <label htmlFor="customerPhone">Customer Phone:</label>
          <input id="customerPhone" type="tel" value={form.customerPhone} onChange={set("customerPhone")} placeholder="e.g. 0999 123 456" />
        </div>

        <div className="form-group full-width">
          <label htmlFor="rateCard">Add from EdiTech Rate Card:</label>
          <select id="rateCard" defaultValue="" onChange={addFromRateCard}>
            <option value="">-- Pick a service to add as an item --</option>
            {PRESETS.map((p, i) => (
              <option key={p.purpose} value={i}>
                {presetLabel(p)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group full-width">
          <div className="qt-items">
            {items.map((it, i) => {
              const line = (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0);
              return (
                <div className="qt-item" key={i}>
                  <div className="qt-item-head">
                    <span>Item {i + 1}</span>
                    <button type="button" className="qt-remove" onClick={() => removeItem(i)} aria-label={`Remove item ${i + 1}`}>
                      Remove
                    </button>
                  </div>
                  <div className="qt-desc">
                    <label htmlFor={`desc-${i}`}>Description</label>
                    <input id={`desc-${i}`} value={it.description} onChange={updateItem(i, "description")} placeholder="e.g. Company Logo" />
                  </div>
                  <div>
                    <label htmlFor={`qty-${i}`}>Qty</label>
                    <input id={`qty-${i}`} type="number" min="0" step="any" inputMode="decimal" value={it.qty} onChange={updateItem(i, "qty")} />
                  </div>
                  <div>
                    <label htmlFor={`price-${i}`}>Unit price (MWK)</label>
                    <input id={`price-${i}`} type="number" min="0" step="any" inputMode="decimal" value={it.unitPrice} onChange={updateItem(i, "unitPrice")} placeholder="0" />
                  </div>
                  <div>
                    <span className="qt-label">Total</span>
                    <div className="qt-linetotal">{mwk(line)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => addItem()}
            disabled={items.length >= MAX_QUOTE_ITEMS}
            style={{ marginTop: "0.7rem" }}
          >
            {items.length >= MAX_QUOTE_ITEMS ? `All ${MAX_QUOTE_ITEMS} item rows used` : "+ Add another item"}
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="discountValue">Discount:</label>
          <div className="qt-inline">
            <select aria-label="Discount type" value={form.discountType} onChange={set("discountType")} style={{ maxWidth: "7rem" }}>
              <option value="amount">MWK</option>
              <option value="percent">%</option>
            </select>
            <input id="discountValue" type="number" min="0" step="any" inputMode="decimal" value={form.discountValue} onChange={set("discountValue")} placeholder="0" />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="taxPercent">Tax (%):</label>
          <input id="taxPercent" type="number" min="0" max="100" step="any" inputMode="decimal" value={form.taxPercent} onChange={set("taxPercent")} placeholder="0" />
        </div>

        <div className="form-group full-width">
          <div className="qt-summary" aria-live="polite">
            <div>
              <span>Sub Total</span>
              <span>{mwk(totals.subTotal)}</span>
            </div>
            <div>
              <span>Discount</span>
              <span>{totals.discountAmount ? `− ${mwk(totals.discountAmount)}` : "None"}</span>
            </div>
            <div>
              <span>Tax</span>
              <span>{totals.taxAmount ? mwk(totals.taxAmount) : "None"}</span>
            </div>
            <div className="qt-grand">
              <span>Grand Total</span>
              <span>{mwk(totals.grandTotal)}</span>
            </div>
            {totals.grandTotal > 0 && <small>{amountToWords(totals.grandTotal)}</small>}
          </div>
        </div>

        {error && <div className="alert-error full-width">{error}</div>}

        <div className="form-group full-width">
          <button type="button" className="btn-primary" onClick={handlePreview}>
            Generate &amp; Preview
          </button>
        </div>
      </form>
    </>
  );
}
