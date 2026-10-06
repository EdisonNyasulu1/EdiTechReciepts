// Shared helpers: money, dates, numbering, amount-in-words.

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");

export function formatMoney(n) {
  return (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}
export const mwk = (n) => `MWK ${formatMoney(n)}`;
export const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** "MWK 10,000" -> 10000 */
export function parseMoney(str) {
  const n = parseFloat(String(str ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Today as yyyy-mm-dd in the user's local time (not UTC). */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysISO(iso, days) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** "2026-08-12" -> "12 August 2026" (the format already used in your database) */
export function formatDateLong(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "12 August 2026" -> { day, month (0-11), year } or null */
export function parseLongDate(str) {
  const m = String(str ?? "").match(/^\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*$/);
  if (!m) return null;
  const month = MONTHS.findIndex((name) => name.toLowerCase().startsWith(m[2].toLowerCase().slice(0, 3)));
  if (month < 0) return null;
  return { day: Number(m[1]), month, year: Number(m[3]) };
}

/** Suggest the next number for a document type, e.g. QT-007 -> QT-008, 1024 -> 1025 */
export function nextDocNumber(records, docType) {
  let best = null;
  for (const r of records || []) {
    if (r.docType !== docType) continue;
    const m = String(r.receiptNo).match(/^(.*?)(\d+)$/);
    if (!m) continue;
    const n = parseInt(m[2], 10);
    if (!best || n > best.n) best = { prefix: m[1], n, width: m[2].length };
  }
  if (!best) return { Receipt: "1", Invoice: "INV-001", Quotation: "QT-001" }[docType] || "1";
  return best.prefix + String(best.n + 1).padStart(best.width, "0");
}

// ---------- amount in words (British style: "One Hundred and Twenty") ----------
const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (r) {
    const s = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : "");
    parts.push(h ? `and ${s}` : s);
  }
  return parts.join(" ");
}

function integerToWords(n) {
  if (n === 0) return "Zero";
  const parts = [];
  let rest = n;
  for (const [value, name] of [[1e9, "Billion"], [1e6, "Million"], [1e3, "Thousand"]]) {
    if (rest >= value) {
      parts.push(`${belowThousand(Math.floor(rest / value))} ${name}`);
      rest %= value;
    }
  }
  if (rest > 0) {
    const s = belowThousand(rest);
    parts.push(parts.length && rest < 100 ? `and ${s}` : s);
  }
  return parts.join(" ");
}

/** 120000 -> "One Hundred and Twenty Thousand Kwacha Only" */
export function amountToWords(amount) {
  const value = roundMoney(amount);
  if (!(value > 0) || value >= 1e12) return "";
  const kwacha = Math.floor(value);
  const tambala = Math.round((value - kwacha) * 100);
  const parts = [];
  if (kwacha) parts.push(`${integerToWords(kwacha)} Kwacha`);
  if (tambala) parts.push(`${integerToWords(tambala)} Tambala`);
  return `${parts.join(" and ")} Only`;
}

// ---------- WhatsApp ----------
/** "0999 123 456" -> "265999123456" (Malawi). Returns "" if it doesn't look like a number. */
export function toWhatsAppNumber(phone) {
  let d = String(phone || "").replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `265${d.slice(1)}`;
  return d.length >= 11 && d.length <= 15 ? d : "";
}
