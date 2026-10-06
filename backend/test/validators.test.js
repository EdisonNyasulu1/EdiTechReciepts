import { test } from "node:test";
import assert from "node:assert/strict";
import { parseId, validateExpense, validateLogin, validateTransaction } from "../validators.js";

const goodTx = {
  receiptNo: " QT-001 ",
  docType: "Quotation",
  date: "12 August 2026",
  customerName: "  Mercy Banda ",
  discount: "",
  amount: "125000.499",
  rawAmount: "MWK 125,000",
  details: { items: [{ description: "Logo", qty: 1, unitPrice: 125000 }] },
};

test("validateTransaction trims, rounds and fills defaults", () => {
  const r = validateTransaction(goodTx);
  assert.equal(r.ok, true);
  assert.equal(r.value.receiptNo, "QT-001");
  assert.equal(r.value.customerName, "Mercy Banda");
  assert.equal(r.value.discount, "None");
  assert.equal(r.value.amount, 125000.5);
  assert.deepEqual(r.value.details, goodTx.details);
});

test("validateTransaction works without details (older backups)", () => {
  const r = validateTransaction({ ...goodTx, details: undefined, rawAmount: undefined });
  assert.equal(r.ok, true);
  assert.equal(r.value.details, null);
  assert.match(r.value.rawAmount, /^MWK /);
});

test("validateTransaction rejects bad input", () => {
  const bad = (patch) => validateTransaction({ ...goodTx, ...patch });
  assert.equal(bad({ receiptNo: "" }).ok, false);
  assert.equal(bad({ receiptNo: "x".repeat(51) }).ok, false);
  assert.equal(bad({ docType: "Memo" }).ok, false);
  assert.equal(bad({ date: "" }).ok, false);
  assert.equal(bad({ customerName: "  " }).ok, false);
  assert.equal(bad({ amount: -1 }).ok, false);
  assert.equal(bad({ amount: "abc" }).ok, false);
  assert.equal(bad({ amount: null }).ok, false);
  assert.equal(bad({ amount: 1e12 }).ok, false);
  assert.equal(bad({ details: [1, 2] }).ok, false);
  assert.equal(bad({ details: "text" }).ok, false);
  assert.equal(bad({ details: { blob: "x".repeat(60_000) } }).ok, false);
  assert.equal(validateTransaction(undefined).ok, false);
});

test("validateTransaction accepts a zero amount (free quotation)", () => {
  assert.equal(validateTransaction({ ...goodTx, amount: 0 }).ok, true);
});

test("validateExpense", () => {
  const good = { date: "2026-08-12", category: "Software", desc: " Adobe ", amount: "15000" };
  const r = validateExpense(good);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { date: "2026-08-12", category: "Software", desc: "Adobe", amount: 15000 });

  assert.equal(validateExpense({ ...good, date: "12/08/2026" }).ok, false);
  assert.equal(validateExpense({ ...good, date: "2026-13-45" }).ok, false);
  assert.equal(validateExpense({ ...good, category: "" }).ok, false);
  assert.equal(validateExpense({ ...good, desc: "" }).ok, false);
  assert.equal(validateExpense({ ...good, amount: 0 }).ok, false);
  assert.equal(validateExpense({ ...good, amount: -5 }).ok, false);
  assert.equal(validateExpense({}).ok, false);
});

test("validateLogin", () => {
  assert.deepEqual(validateLogin({ username: " admin ", password: "pw" }), { ok: true, value: { username: "admin", password: "pw" } });
  assert.equal(validateLogin({ username: "admin" }).ok, false);
  assert.equal(validateLogin({ username: "admin", password: { $ne: "" } }).ok, false); // object injection attempt
  assert.equal(validateLogin({ username: ["a"], password: "pw" }).ok, false);
  assert.equal(validateLogin({ username: "a".repeat(51), password: "pw" }).ok, false);
  assert.equal(validateLogin(null).ok, false);
});

test("parseId only accepts plain positive integers", () => {
  assert.equal(parseId("42"), 42);
  assert.equal(parseId("0"), 0);
  assert.equal(parseId("-1"), null);
  assert.equal(parseId("1; DROP TABLE users"), null);
  assert.equal(parseId("4.5"), null);
  assert.equal(parseId(undefined), null);
  assert.equal(parseId("1234567890"), null);
});
