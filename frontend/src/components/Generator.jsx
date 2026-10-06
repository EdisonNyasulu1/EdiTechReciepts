import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import ReceiptForm from "./ReceiptForm.jsx";
import QuotationForm from "./QuotationForm.jsx";
import PreviewModal from "./PreviewModal.jsx";

const DOC_TYPES = ["Receipt", "Invoice", "Quotation"];

export default function Generator({ revenueData, onTransactionSaved }) {
  const { user } = useAuth();
  const [docType, setDocType] = useState("Receipt");
  const [preview, setPreview] = useState(null); // { docType, data } while the modal is open
  const [formVersion, setFormVersion] = useState(0);

  // After a document has been saved, start a fresh form (with the next number) for the next one.
  // If it was NOT saved (the person pressed "Edit"), keep everything they typed.
  function closePreview(didSave) {
    setPreview(null);
    if (didSave) setFormVersion((v) => v + 1);
  }

  const Form = docType === "Quotation" ? QuotationForm : ReceiptForm;

  return (
    <div className="card tab-content active">
      <div className="doc-type-toggle">
        {DOC_TYPES.map((t) => (
          <button key={t} type="button" className={`doc-btn ${docType === t ? "active" : ""}`} onClick={() => setDocType(t)}>
            {t}
          </button>
        ))}
      </div>

      <Form
        key={`${docType}-${formVersion}`}
        docType={docType}
        user={user}
        revenueData={revenueData}
        onPreview={setPreview}
      />

      {preview && <PreviewModal doc={preview} onClose={closePreview} onSaved={onTransactionSaved} />}
    </div>
  );
}
