import React, { useEffect, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { api } from "../api";

export default function PreviewModal({ docType, form, onClose, onSaved }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(false); // only record the transaction once per open modal

  useEffect(() => {
    const img = new Image();
    // Place this file in frontend/public/ so it's served at the site root
    img.src = "/Editech-Graphix-Receipt-v2.1.jpg";
    imgRef.current = img;
    img.onload = drawReceipt;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawReceipt() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, 736, 460);

    ctx.font = 'italic 600 13px "Poppins", sans-serif';
    ctx.fillStyle = "#270540";

    ctx.fillText(form.receiptNo, 138, 118);
    ctx.fillText(form.date, 555, 118);
    ctx.fillText(form.customerName, 140, 192);
    ctx.fillText(form.amountFigures, 120, 225);
    ctx.fillText(form.discount || "None", 465, 225);
    ctx.fillText(form.amountWords, 115, 260);
    ctx.fillText(form.purpose, 90, 292);
    ctx.fillText(form.quantity, 500, 291);
    ctx.fillText(form.accountNo, 115, 326);
    ctx.fillText(form.time, 385, 328);

    ctx.font = 'bold 14px "Poppins", sans-serif';
    ctx.fillText(form.amountFigures, 145, 369);

    ctx.font = '600 12px "Poppins", sans-serif';
    ctx.fillText(form.receivedBy, 330, 359);
  }

  async function recordTransaction() {
    if (savedRef.current) return;
    savedRef.current = true;
    setSaving(true);
    try {
      const rawAmount = form.amountFigures;
      const numericAmount = parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, "")) || 0;

      await api.addTransaction({
        receiptNo: form.receiptNo,
        docType,
        date: form.date,
        customerName: form.customerName,
        discount: form.discount || "None",
        amount: numericAmount,
        rawAmount,
      });
      if (onSaved) await onSaved();
    } catch (err) {
      console.error("Failed to record transaction:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadJpg() {
    await recordTransaction();
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `${docType}-${form.receiptNo || "000"}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  }

  async function handleDownloadPdf() {
    await recordTransaction();
    const canvas = canvasRef.current;
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    const opt = {
      margin: 0,
      filename: `${docType}-${form.receiptNo || "000"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "px", format: [736, 460], orientation: "landscape" },
    };
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = `<img src="${imgData}" style="width:736px; height:460px;" />`;
    html2pdf().set(opt).from(tempContainer).save();
  }

  async function handleShare() {
    await recordTransaction();
    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `${docType}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${docType} - EdiTech Graphix` });
        } catch {
          // user cancelled share sheet - ignore
        }
      } else {
        handleDownloadJpg();
      }
    }, "image/jpeg");
  }

  return (
    <div className="modal" style={{ display: "flex" }}>
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>
          &times;
        </span>
        <h3>{docType} Preview</h3>

        <div className="canvas-wrapper">
          <canvas ref={canvasRef} id="receiptCanvas" width="736" height="460" />
        </div>

        <div className="modal-actions">
          <button className="btn-action" onClick={handleDownloadJpg} disabled={saving}>
            Download JPG
          </button>
          <button className="btn-action" onClick={handleDownloadPdf} disabled={saving}>
            Download PDF
          </button>
          <button className="btn-primary" onClick={handleShare} disabled={saving}>
            Share via WhatsApp
          </button>
          <button className="btn-secondary-dark" onClick={onClose}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
