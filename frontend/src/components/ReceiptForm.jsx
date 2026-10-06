import React, { useState } from "react";
import { PRESETS, presetLabel } from "../data/presets.js";
import { amountToWords, formatDateLong, mwk, nextDocNumber, parseMoney, todayISO } from "../utils/format.js";
import { MAX_AMOUNT } from "../utils/documents.js";
import "../styles/documents.css";

const REQUIRED = {
  receiptNo: "Doc / Receipt No",
  date: "Date",
  customerName: "Customer / Company Name",
  amountFigures: "Amount (Figures)",
  amountWords: "Amount in Words",
  purpose: "For (Purpose)",
  quantity: "Quantity",
  receivedBy: "Received / Issued By",
};

export default function ReceiptForm({ docType, user, revenueData, onPreview }) {
  const [form, setForm] = useState(() => ({
    receiptNo: nextDocNumber(revenueData, docType),
    date: todayISO(),
    customerName: "",
    amountFigures: "",
    discount: "",
    amountWords: "",
    purpose: "",
    quantity: "",
    accountNo: "",
    time: "",
    receivedBy: user?.full_name || "",
  }));
  const [wordsEdited, setWordsEdited] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function handleAmount(e) {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      amountFigures: value,
      amountWords: wordsEdited ? prev.amountWords : amountToWords(parseMoney(value)),
    }));
  }

  function handleAmountBlur() {
    const n = parseMoney(form.amountFigures);
    if (n > 0) setForm((prev) => ({ ...prev, amountFigures: mwk(n) }));
  }

  function handleWords(e) {
    const value = e.target.value;
    setWordsEdited(value.trim() !== ""); // clearing the box switches auto-fill back on
    setForm((prev) => ({ ...prev, amountWords: value }));
  }

  function handlePreset(e) {
    const idx = e.target.value;
    if (idx === "") return;
    setWordsEdited(false);
    if (idx === "OTHER") {
      setForm((prev) => ({ ...prev, purpose: "", quantity: "1", amountFigures: "", amountWords: "" }));
      return;
    }
    const p = PRESETS[Number(idx)];
    setForm((prev) => ({
      ...prev,
      purpose: p.purpose,
      quantity: "1",
      amountFigures: mwk(p.price),
      amountWords: amountToWords(p.price),
    }));
  }

  function handlePreview() {
    const missing = Object.keys(REQUIRED).filter((f) => !String(form[f] ?? "").trim());
    if (missing.length) {
      setError(`Please fill in: ${missing.map((f) => REQUIRED[f]).join(", ")}.`);
      return;
    }
    const amount = parseMoney(form.amountFigures);
    if (amount <= 0 || amount > MAX_AMOUNT) {
      setError("Please enter a valid amount, for example MWK 10,000.");
      return;
    }
    setError("");
    onPreview({
      docType,
      data: {
        ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])),
        date: formatDateLong(form.date),
      },
    });
  }

  return (
    <>
      <h2>Generate {docType}</h2>
      <p>Fill in the client and project details below.</p>

      <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
        <div className="form-group full-width">
          <label htmlFor="servicePreset">Preset Services (EdiTech Rate Card):</label>
          <select id="servicePreset" onChange={handlePreset} defaultValue="">
            <option value="">-- Select Design Service --</option>
            {PRESETS.map((p, i) => (
              <option key={p.purpose} value={i}>
                {presetLabel(p)}
              </option>
            ))}
            <option value="OTHER">Other / Custom Service (Enter Manually)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="receiptNo">Doc / Receipt No:</label>
          <input id="receiptNo" value={form.receiptNo} onChange={set("receiptNo")} placeholder="e.g. 1024" />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date:</label>
          <input id="date" type="date" value={form.date} onChange={set("date")} />
        </div>

        <div className="form-group full-width">
          <label htmlFor="customerName">Customer / Company Name:</label>
          <input id="customerName" value={form.customerName} onChange={set("customerName")} placeholder="Client or Company Name" />
        </div>

        <div className="form-group">
          <label htmlFor="amountFigures">Amount (Figures):</label>
          <input
            id="amountFigures"
            value={form.amountFigures}
            onChange={handleAmount}
            onBlur={handleAmountBlur}
            placeholder="e.g. 10000"
            inputMode="decimal"
          />
        </div>

        <div className="form-group">
          <label htmlFor="discount">Discount Applied:</label>
          <input id="discount" value={form.discount} onChange={set("discount")} placeholder="e.g. None / MWK 2,000" />
        </div>

        <div className="form-group full-width">
          <label htmlFor="amountWords">Amount in Words (filled in automatically):</label>
          <input id="amountWords" value={form.amountWords} onChange={handleWords} placeholder="e.g. Ten Thousand Kwacha Only" />
        </div>

        <div className="form-group">
          <label htmlFor="purpose">For (Purpose of Design):</label>
          <input id="purpose" value={form.purpose} onChange={set("purpose")} placeholder="e.g. Poster / Flyer" />
        </div>

        <div className="form-group">
          <label htmlFor="quantity">Quantity:</label>
          <input id="quantity" value={form.quantity} onChange={set("quantity")} placeholder="e.g. 1" />
        </div>

        <div className="form-group">
          <label htmlFor="accountNo">Account # Credited:</label>
          <input id="accountNo" value={form.accountNo} onChange={set("accountNo")} placeholder="e.g. 088556688" />
        </div>

        <div className="form-group">
          <label htmlFor="time">Time:</label>
          <input id="time" value={form.time} onChange={set("time")} placeholder="e.g. 11:30 AM" />
        </div>

        <div className="form-group full-width">
          <label htmlFor="receivedBy">Received / Issued By:</label>
          <input id="receivedBy" value={form.receivedBy} onChange={set("receivedBy")} />
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
