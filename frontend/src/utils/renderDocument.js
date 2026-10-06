// Draws a document (receipt / invoice / quotation) onto a <canvas> over your template image.
//
// Coordinates are written in a fixed "design space" per template (see SPECS) and the canvas is
// rendered at `scale` times that size, so the JPG/PDF output is sharp.

import { formatMoney, mwk } from "./format.js";

const INK = "#270540";
const FONT = '"Poppins", "Segoe UI", Arial, sans-serif';

// Template images live in frontend/public/
const SPECS = {
  receipt: { src: "/Editech-Graphix-Receipt-v2.1.jpg", w: 736, h: 460, scale: 3 }, // 2208 x 1380 px
  quotation: { src: "/Editech-Graphix-Quotation.jpg", w: 1848, h: 2009, scale: 1.5 }, // 2772 x 3014 px
};

export const specFor = (docType) => (docType === "Quotation" ? SPECS.quotation : SPECS.receipt);
export const isPortrait = (docType) => docType === "Quotation";

// ---------- loading ----------
const images = new Map();

function loadImage(src) {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          images.delete(src);
          reject(new Error(`Could not load the template image "${src}". Check that it is inside frontend/public/.`));
        };
        img.src = src;
      })
    );
  }
  return images.get(src);
}

// Without this, the first render can happen before Poppins has loaded and the text falls back to Arial.
async function ensureFonts() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all(
      ['italic 600 20px "Poppins"', '600 20px "Poppins"', '700 20px "Poppins"'].map((f) => document.fonts.load(f))
    );
  } catch {
    /* fall back to the system font */
  }
}

// ---------- text helpers ----------
/** Draw text; shrinks the font (down to 60%) so it never runs past maxWidth. */
function put(ctx, text, { x, y, maxWidth, size, style = "italic 600", align = "left", baseline = "alphabetic" }) {
  const t = String(text ?? "");
  if (!t) return;
  let s = size;
  ctx.font = `${style} ${s}px ${FONT}`;
  while (maxWidth && ctx.measureText(t).width > maxWidth && s > size * 0.6) {
    s -= 0.5;
    ctx.font = `${style} ${s}px ${FONT}`;
  }
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(t, x, y, maxWidth || undefined);
}

/** Greedy word-wrap into at most maxLines lines (last line gets an ellipsis if cut). Uses ctx.font. */
function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (!cur || ctx.measureText(t).width <= maxWidth) cur = t;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    let last = lines.slice(maxLines - 1).join(" ");
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines.length = maxLines - 1;
    lines.push(`${last}…`);
  }
  return lines;
}

// ---------- receipt / invoice ----------
function drawReceipt(ctx, doc) {
  const f = doc.data;

  // The template says "CASH RECEIPT". For an invoice, cover that title and write the right one.
  if (doc.docType === "Invoice") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(272, 150, 164, 28);
    ctx.fillStyle = INK;
    put(ctx, "INVOICE", { x: 353.5, y: 167.3, size: 23, style: "700", align: "center" });
  }

  const S = 13;
  put(ctx, f.receiptNo, { x: 138, y: 118, maxWidth: 95, size: S });
  put(ctx, f.date, { x: 555, y: 118, maxWidth: 122, size: S });
  put(ctx, f.customerName, { x: 140, y: 192, maxWidth: 535, size: S });
  put(ctx, f.amountFigures, { x: 120, y: 225, maxWidth: 230, size: S });
  put(ctx, f.discount || "None", { x: 465, y: 225, maxWidth: 205, size: S });
  put(ctx, f.amountWords, { x: 115, y: 260, maxWidth: 560, size: S });
  put(ctx, f.purpose, { x: 90, y: 292, maxWidth: 340, size: S });
  put(ctx, f.quantity, { x: 500, y: 291, maxWidth: 175, size: S });
  put(ctx, f.accountNo, { x: 115, y: 326, maxWidth: 225, size: S });
  put(ctx, f.time, { x: 385, y: 328, maxWidth: 285, size: S });
  put(ctx, f.amountFigures, { x: 145, y: 369, maxWidth: 135, size: 14, style: "700" });
  put(ctx, f.receivedBy, { x: 383, y: 359, maxWidth: 160, size: 12, style: "600", align: "center" });
}

// ---------- quotation ----------
const ROW_CENTERS = [861, 956, 1051, 1146, 1243];

function drawItem(ctx, item, y) {
  const base = { baseline: "middle", size: 34 };

  // description: one line if it fits, otherwise two smaller lines
  const maxW = 815;
  ctx.font = `italic 600 34px ${FONT}`;
  if (ctx.measureText(item.description).width <= maxW) {
    put(ctx, item.description, { ...base, x: 120, y, maxWidth: maxW });
  } else {
    ctx.font = `italic 600 28px ${FONT}`;
    wrapLines(ctx, item.description, maxW, 2).forEach((line, i, all) => {
      put(ctx, line, { x: 120, y: y + (i - (all.length - 1) / 2) * 34, maxWidth: maxW, size: 28, baseline: "middle" });
    });
  }

  put(ctx, String(Number(item.qty)), { ...base, x: 1063, y, maxWidth: 200, align: "center" });
  put(ctx, formatMoney(item.unitPrice), { ...base, x: 1412, y, maxWidth: 225, align: "right" });
  put(ctx, formatMoney(item.total), { ...base, x: 1738, y, maxWidth: 285, align: "right" });
}

function drawQuotation(ctx, f) {
  const S = 34;
  // header (values sit just above the dotted lines)
  put(ctx, f.quoteNo, { x: 378, y: 275, maxWidth: 235, size: S });
  put(ctx, f.quoteDate, { x: 1402, y: 275, maxWidth: 300, size: S });
  put(ctx, f.preparedBy, { x: 355, y: 358, maxWidth: 365, size: S });
  put(ctx, f.dueDate, { x: 1402, y: 358, maxWidth: 300, size: S });
  put(ctx, f.customerName, { x: 478, y: 622, maxWidth: 570, size: S });
  put(ctx, f.customerPhone, { x: 1378, y: 622, maxWidth: 340, size: S });

  // item rows (the template has 5)
  (f.items || []).slice(0, ROW_CENTERS.length).forEach((item, i) => drawItem(ctx, item, ROW_CENTERS[i]));

  // totals box
  const T = { x: 1738, maxWidth: 290, size: S, align: "right" };
  put(ctx, mwk(f.subTotal), { ...T, y: 1377 });
  put(ctx, f.discountAmount ? mwk(f.discountAmount) : "None", { ...T, y: 1448 });
  put(ctx, f.taxAmount ? mwk(f.taxAmount) : "None", { ...T, y: 1520 });
  put(ctx, mwk(f.grandTotal), { ...T, y: 1590, size: 36, style: "700" });

  // amount in words: first line starts after the label, second line has the full width
  ctx.font = `italic 600 30px ${FONT}`;
  const words = String(f.amountWords || "").split(/\s+/).filter(Boolean);
  let line1 = "";
  let i = 0;
  for (; i < words.length; i++) {
    const t = line1 ? `${line1} ${words[i]}` : words[i];
    if (ctx.measureText(t).width > 594) break;
    line1 = t;
  }
  put(ctx, line1, { x: 374, y: 1670, maxWidth: 594, size: 30 });
  put(ctx, words.slice(i).join(" "), { x: 128, y: 1742, maxWidth: 845, size: 30 });
}

// ---------- public API ----------
/** Render `doc` ({ docType, data }) into `canvas`. Resolves when the drawing is complete. */
export async function renderDocument(canvas, doc) {
  const spec = specFor(doc.docType);
  const [img] = await Promise.all([loadImage(spec.src), ensureFonts()]);

  canvas.width = Math.round(spec.w * spec.scale);
  canvas.height = Math.round(spec.h * spec.scale);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(spec.scale, 0, 0, spec.scale, 0, 0);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, spec.w, spec.h);
  ctx.fillStyle = INK;

  if (doc.docType === "Quotation") drawQuotation(ctx, doc.data);
  else drawReceipt(ctx, doc);
}

export function canvasToBlob(canvas, type = "image/jpeg", quality = 0.95) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image."))), type, quality)
  );
}
