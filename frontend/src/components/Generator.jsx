import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import PreviewModal from "./PreviewModal.jsx";

const PRESETS = [
  { label: "Poster / Flyer (MWK 10,000)", purpose: "Poster / Flyer", qty: "1", amount: "MWK 10,000", words: "Ten Thousand Kwacha Only" },
  { label: "Banners (MWK 15,000)", purpose: "Banners", qty: "1", amount: "MWK 15,000", words: "Fifteen Thousand Kwacha Only" },
  { label: "Product Labels / Sticker (MWK 10,000)", purpose: "Product Labels / Sticker", qty: "1", amount: "MWK 10,000", words: "Ten Thousand Kwacha Only" },
  { label: "Menu Design (MWK 10,000)", purpose: "Menu Design", qty: "1", amount: "MWK 10,000", words: "Ten Thousand Kwacha Only" },
  { label: "Book Cover (MWK 10,000)", purpose: "Book Cover", qty: "1", amount: "MWK 10,000", words: "Ten Thousand Kwacha Only" },
  { label: "Music Cover (MWK 10,000)", purpose: "Music Cover", qty: "1", amount: "MWK 10,000", words: "Ten Thousand Kwacha Only" },
  { label: "Business Card (MWK 10,000)", purpose: "Business Card", qty: "1", amount: "MWK 10,000", words: "Ten Thousand Kwacha Only" },
  { label: "Invoice & Letter Head (MWK 12,000)", purpose: "Invoice & Letter Head", qty: "1", amount: "MWK 12,000", words: "Twelve Thousand Kwacha Only" },
  { label: "Calender (MWK 15,000)", purpose: "Calender", qty: "1", amount: "MWK 15,000", words: "Fifteen Thousand Kwacha Only" },
  { label: "T-Shirt & Golf Shirt (MWK 10,000)", purpose: "T-Shirt & Golf Shirt", qty: "1", amount: "MWK 10,000", words: "Ten Thousand Kwacha Only" },
  { label: "Invitation Cards (MWK 10,000)", purpose: "Invitation Cards", qty: "1", amount: "MWK 10,000", words: "Ten Thousand Kwacha Only" },
  { label: "Company Logo (MWK 20,000)", purpose: "Company Logo", qty: "1", amount: "MWK 20,000", words: "Twenty Thousand Kwacha Only" },
];

const EMPTY_FORM = {
  receiptNo: "",
  date: "",
  customerName: "",
  amountFigures: "",
  discount: "",
  amountWords: "",
  purpose: "",
  quantity: "",
  accountNo: "",
  time: "",
  receivedBy: "",
};

export default function Generator({ onTransactionSaved }) {
  const { user } = useAuth();
  const [docType, setDocType] = useState("Receipt");
  const [form, setForm] = useState({ ...EMPTY_FORM, receivedBy: user?.full_name || "" });
  const [showModal, setShowModal] = useState(false);

  const requiredFields = [
    "receiptNo",
    "date",
    "customerName",
    "amountFigures",
    "amountWords",
    "purpose",
    "quantity",
    "receivedBy",
  ];

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePreset = (e) => {
    const idx = e.target.value;
    if (idx === "") return;

    if (idx === "OTHER") {
      setForm((prev) => ({ ...prev, purpose: "", quantity: "1", amountFigures: "", amountWords: "" }));
      return;
    }

    const preset = PRESETS[Number(idx)];
    setForm((prev) => ({
      ...prev,
      purpose: preset.purpose,
      quantity: preset.qty,
      amountFigures: preset.amount,
      amountWords: preset.words,
    }));
  };

  const handlePreview = () => {
    const missing = requiredFields.some((f) => !form[f]?.trim());
    if (missing) {
      alert("Please fill in all required fields.");
      return;
    }
    setShowModal(true);
  };

  return (
    <div className="card tab-content active">
      <div className="doc-type-toggle">
        {["Receipt", "Invoice", "Quotation"].map((t) => (
          <button
            key={t}
            type="button"
            className={`doc-btn ${docType === t ? "active" : ""}`}
            onClick={() => setDocType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <h2>Generate {docType}</h2>
      <p>Fill in the client and project details below.</p>

      <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
        <div className="form-group full-width">
          <label htmlFor="servicePreset">Preset Services (EdiTech Rate Card):</label>
          <select id="servicePreset" onChange={handlePreset} defaultValue="">
            <option value="">-- Select Design Service --</option>
            {PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
            <option value="OTHER">Other / Custom Service (Enter Manually)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="receiptNo">Doc / Receipt No:</label>
          <input id="receiptNo" value={form.receiptNo} onChange={handleChange("receiptNo")} placeholder="e.g. 1024" required />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date (in full):</label>
          <input id="date" value={form.date} onChange={handleChange("date")} placeholder="e.g. 12 August 2026" required />
        </div>

        <div className="form-group full-width">
          <label htmlFor="customerName">Customer / Company Name:</label>
          <input id="customerName" value={form.customerName} onChange={handleChange("customerName")} placeholder="Client or Company Name" required />
        </div>

        <div className="form-group">
          <label htmlFor="amountFigures">Amount (Figures):</label>
          <input id="amountFigures" value={form.amountFigures} onChange={handleChange("amountFigures")} placeholder="e.g. MWK 10,000" required />
        </div>

        <div className="form-group">
          <label htmlFor="discount">Discount Applied:</label>
          <input id="discount" value={form.discount} onChange={handleChange("discount")} placeholder="e.g. None / MWK 2,000" />
        </div>

        <div className="form-group full-width">
          <label htmlFor="amountWords">Amount in Words:</label>
          <input id="amountWords" value={form.amountWords} onChange={handleChange("amountWords")} placeholder="e.g. Ten Thousand Kwacha Only" required />
        </div>

        <div className="form-group">
          <label htmlFor="purpose">For (Purpose of Design):</label>
          <input id="purpose" value={form.purpose} onChange={handleChange("purpose")} placeholder="e.g. Poster / Flyer" required />
        </div>

        <div className="form-group">
          <label htmlFor="quantity">Quantity:</label>
          <input id="quantity" value={form.quantity} onChange={handleChange("quantity")} placeholder="e.g. 1" required />
        </div>

        <div className="form-group">
          <label htmlFor="accountNo">Account # Credited:</label>
          <input id="accountNo" value={form.accountNo} onChange={handleChange("accountNo")} placeholder="e.g. 088556688" />
        </div>

        <div className="form-group">
          <label htmlFor="time">Time:</label>
          <input id="time" value={form.time} onChange={handleChange("time")} placeholder="e.g. 11:30 AM" />
        </div>

        <div className="form-group full-width">
          <label htmlFor="receivedBy">Received / Issued By:</label>
          <input id="receivedBy" value={form.receivedBy} onChange={handleChange("receivedBy")} required />
        </div>

        <div className="form-group full-width">
          <button type="button" className="btn-primary" onClick={handlePreview}>
            Generate & Preview
          </button>
        </div>
      </form>

      {showModal && (
        <PreviewModal
          docType={docType}
          form={form}
          onClose={() => setShowModal(false)}
          onSaved={onTransactionSaved}
        />
      )}
    </div>
  );
}
