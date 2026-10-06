// Input validation for the API. Each validator returns { ok: true, value } or { ok: false, error }.

export const DOC_TYPES = Object.freeze(["Receipt", "Invoice", "Quotation"]);
export const MAX_AMOUNT = 9_999_999_999; // fits NUMERIC(12,2)
const MAX_DETAILS_CHARS = 50_000;

const isText = (v, max) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const fail = (error) => ({ ok: false, error });

export function parseId(v) {
  return /^\d{1,9}$/.test(String(v)) ? Number(v) : null;
}

export function validateLogin(body) {
  const { username, password } = body ?? {};
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    return fail("Username and password are required.");
  }
  if (username.length > 50 || password.length > 200) return fail("Invalid username or password.");
  return { ok: true, value: { username: username.trim(), password } };
}

export function validateTransaction(body) {
  const { receiptNo, docType, date, customerName, discount, amount, rawAmount, details } = body ?? {};

  if (!isText(receiptNo, 50)) return fail("A document number is required (max 50 characters).");
  if (!DOC_TYPES.includes(docType)) return fail("Unknown document type.");
  if (!isText(date, 100)) return fail("A date is required.");
  if (!isText(customerName, 255)) return fail("A customer name is required (max 255 characters).");

  const amt = Number(amount);
  if (amount === null || amount === "" || !Number.isFinite(amt) || amt < 0 || amt > MAX_AMOUNT) {
    return fail("The amount is not valid.");
  }

  if (details != null) {
    if (!isPlainObject(details)) return fail("Document details are not valid.");
    if (JSON.stringify(details).length > MAX_DETAILS_CHARS) return fail("Document details are too large.");
  }

  return {
    ok: true,
    value: {
      receiptNo: receiptNo.trim(),
      docType,
      date: date.trim(),
      customerName: customerName.trim(),
      discount: isText(discount, 100) ? discount.trim() : "None",
      amount: Math.round(amt * 100) / 100,
      rawAmount: isText(rawAmount, 100) ? rawAmount.trim() : `MWK ${amt.toLocaleString("en-US")}`,
      details: details ?? null,
    },
  };
}

export function validateExpense(body) {
  const { date, category, desc, amount } = body ?? {};

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return fail("A valid date is required.");
  }
  if (!isText(category, 100)) return fail("A category is required.");
  if (!isText(desc, 1000)) return fail("A description is required.");

  const amt = Number(amount);
  if (amount === null || amount === "" || !Number.isFinite(amt) || amt <= 0 || amt > MAX_AMOUNT) {
    return fail("The amount is not valid.");
  }

  return { ok: true, value: { date, category: category.trim(), desc: desc.trim(), amount: Math.round(amt * 100) / 100 } };
}
