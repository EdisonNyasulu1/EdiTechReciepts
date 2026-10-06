import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { canvasToBlob, isPortrait, renderDocument } from "../utils/renderDocument.js";
import { docNumber, toTransactionPayload } from "../utils/documents.js";
import { mwk, toWhatsAppNumber } from "../utils/format.js";
import "../styles/documents.css";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * doc    : { docType, data }
 * saved  : true when re-opening a record that is already in the database (nothing is saved again)
 * onClose(didSave) / onSaved() : callbacks
 */
export default function PreviewModal({ doc, saved = false, onClose, onSaved }) {
  const canvasRef = useRef(null);
  const recorded = useRef(saved); // already in the database?
  const didSave = useRef(false); // saved while this modal was open?
  const inflight = useRef(null); // a save currently running
  const [view, setView] = useState("loading"); // loading | ready | error
  const [viewError, setViewError] = useState("");
  const [saveState, setSaveState] = useState(saved ? "stored" : "idle"); // idle | saving | saved | duplicate | failed | stored
  const [saveMessage, setSaveMessage] = useState("");

  const { docType, data } = doc;
  const number = docNumber(doc);
  const baseName = `${docType}-${String(number || "000").replace(/[^\w.-]+/g, "_")}`;

  const close = useCallback(() => onClose?.(didSave.current), [onClose]);

  // draw the document
  useEffect(() => {
    let cancelled = false;
    setView("loading");
    renderDocument(canvasRef.current, doc)
      .then(() => !cancelled && setView("ready"))
      .catch((err) => {
        if (cancelled) return;
        setViewError(err.message);
        setView("error");
      });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  // Esc closes
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  async function saveNow() {
    setSaveState("saving");
    try {
      await api.addTransaction(toTransactionPayload(doc));
      recorded.current = true;
      didSave.current = true;
      setSaveState("saved");
      setSaveMessage("");
      if (onSaved) await onSaved();
    } catch (err) {
      if (err.status === 409) {
        recorded.current = true; // don't keep retrying
        setSaveState("duplicate");
        setSaveMessage(`${docType} ${number} is already in your records, so it was not saved a second time.`);
      } else {
        setSaveState("failed");
        setSaveMessage(`${err.message} This ${docType.toLowerCase()} is NOT saved to your records yet.`);
      }
    }
  }

  /** Record the document once (never throws - the banner tells the person what happened). */
  function ensureSaved() {
    if (recorded.current) return Promise.resolve();
    if (!inflight.current) {
      inflight.current = saveNow().finally(() => {
        inflight.current = null;
      });
    }
    return inflight.current;
  }

  async function handleDownloadJpg() {
    ensureSaved();
    const blob = await canvasToBlob(canvasRef.current, "image/jpeg", 0.95);
    triggerDownload(blob, `${baseName}.jpg`);
  }

  async function handleDownloadPdf() {
    ensureSaved();
    const canvas = canvasRef.current;
    const { jsPDF } = await import("jspdf");
    const w = 210; // mm - the page is 210 mm wide; its height follows the template's proportions
    const h = (w * canvas.height) / canvas.width;
    const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "mm", format: [w, h], compress: true });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, w, h);
    pdf.save(`${baseName}.pdf`);
  }

  async function handleShare() {
    const saving = ensureSaved(); // runs alongside, so the share sheet still counts as a direct tap
    const blob = await canvasToBlob(canvasRef.current, "image/jpeg", 0.95);
    const file = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    const total = docType === "Quotation" ? mwk(data.grandTotal) : data.amountFigures;
    const text = `Hello ${data.customerName}, here is your ${docType.toLowerCase()} ${number} from EdiTech Graphix (${total}).`;

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${docType} ${number} - EdiTech Graphix`, text });
      } else {
        // Desktop: save the image, then open WhatsApp (straight to the customer if we have their number)
        triggerDownload(blob, file.name);
        const to = toWhatsAppNumber(data.customerPhone);
        window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      }
    } catch (err) {
      if (err?.name !== "AbortError") console.error("Share failed:", err); // AbortError = person closed the share sheet
    }
    await saving;
  }

  const busy = view !== "ready" || saveState === "saving";

  return (
    <div className="modal" style={{ display: "flex" }} role="dialog" aria-modal="true" aria-label={`${docType} preview`}>
      <div className="modal-content">
        <span className="close-modal" onClick={close} role="button" aria-label="Close">
          &times;
        </span>
        <h3>{saved ? `${docType} ${number}` : `${docType} Preview`}</h3>

        {saveState === "saving" && <div className="doc-banner">Saving to your records…</div>}
        {saveState === "saved" && <div className="doc-banner ok">Saved to your records.</div>}
        {saveState === "stored" && <div className="doc-banner ok">This is the saved copy from your records.</div>}
        {saveState === "duplicate" && <div className="doc-banner warn">{saveMessage}</div>}
        {saveState === "failed" && (
          <div className="doc-banner err">
            {saveMessage}{" "}
            <button type="button" className="doc-banner-btn" onClick={ensureSaved}>
              Retry save
            </button>
          </div>
        )}
        {view === "loading" && <div className="doc-banner">Preparing preview…</div>}
        {view === "error" && <div className="doc-banner err">{viewError}</div>}

        <div className={`canvas-wrapper ${isPortrait(docType) ? "portrait" : ""}`}>
          <canvas ref={canvasRef} id="receiptCanvas" />
        </div>

        <div className="modal-actions">
          <button className="btn-action" onClick={handleDownloadJpg} disabled={busy}>
            Download Photo (JPG)
          </button>
          <button className="btn-action" onClick={handleDownloadPdf} disabled={busy}>
            Download PDF
          </button>
          <button className="btn-primary" onClick={handleShare} disabled={busy}>
            Share via WhatsApp
          </button>
          <button className="btn-secondary-dark" onClick={close}>
            {saved ? "Close" : saveState === "saved" || saveState === "duplicate" ? "Done" : "Edit"}
          </button>
        </div>
      </div>
    </div>
  );
}
