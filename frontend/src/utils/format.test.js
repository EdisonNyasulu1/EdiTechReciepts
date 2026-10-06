import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDaysISO, amountToWords, formatDateLong, formatMoney, mwk, nextDocNumber, parseLongDate, parseMoney, roundMoney, toWhatsAppNumber,
} from "./format.js";

test("amountToWords - British style with 'and'", () => {
  assert.equal(amountToWords(10000), "Ten Thousand Kwacha Only");
  assert.equal(amountToWords(12000), "Twelve Thousand Kwacha Only");
  assert.equal(amountToWords(120000), "One Hundred and Twenty Thousand Kwacha Only");
  assert.equal(amountToWords(1250000), "One Million Two Hundred and Fifty Thousand Kwacha Only");
  assert.equal(amountToWords(1050), "One Thousand and Fifty Kwacha Only");
  assert.equal(amountToWords(25), "Twenty-Five Kwacha Only");
  assert.equal(amountToWords(1), "One Kwacha Only");
  assert.equal(amountToWords(2000000000), "Two Billion Kwacha Only");
});

test("amountToWords - tambala and edge cases", () => {
  assert.equal(amountToWords(10.5), "Ten Kwacha and Fifty Tambala Only");
  assert.equal(amountToWords(0.29), "Twenty-Nine Tambala Only");
  assert.equal(amountToWords(0), "");
  assert.equal(amountToWords(-5), "");
  assert.equal(amountToWords("abc"), "");
  assert.equal(amountToWords(1e12), "");
});

test("money helpers", () => {
  assert.equal(parseMoney("MWK 10,000"), 10000);
  assert.equal(parseMoney("12.50"), 12.5);
  assert.equal(parseMoney(""), 0);
  assert.equal(parseMoney(undefined), 0);
  assert.equal(formatMoney(1234567.891), "1,234,567.89");
  assert.equal(mwk(5000), "MWK 5,000");
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
});

test("date helpers", () => {
  assert.equal(formatDateLong("2026-08-05"), "5 August 2026");
  assert.equal(formatDateLong(""), "");
  assert.equal(addDaysISO("2026-12-25", 14), "2027-01-08");
  assert.equal(addDaysISO("2026-02-20", 14), "2026-03-06");
  assert.equal(addDaysISO("", 14), "");
  assert.deepEqual(parseLongDate("12 August 2026"), { day: 12, month: 7, year: 2026 });
  assert.deepEqual(parseLongDate(" 3 sep 2026 "), { day: 3, month: 8, year: 2026 });
  assert.equal(parseLongDate("garbage"), null);
  assert.equal(parseLongDate("12 Smarch 2026"), null);
});

test("nextDocNumber continues each document type separately", () => {
  const rows = [
    { docType: "Quotation", receiptNo: "QT-009" },
    { docType: "Quotation", receiptNo: "QT-010" },
    { docType: "Receipt", receiptNo: "1024" },
  ];
  assert.equal(nextDocNumber(rows, "Quotation"), "QT-011");
  assert.equal(nextDocNumber(rows, "Receipt"), "1025");
  assert.equal(nextDocNumber(rows, "Invoice"), "INV-001");
  assert.equal(nextDocNumber([], "Quotation"), "QT-001");
  assert.equal(nextDocNumber([{ docType: "Receipt", receiptNo: "A-99" }], "Receipt"), "A-100");
  assert.equal(nextDocNumber([{ docType: "Receipt", receiptNo: "no digits" }], "Receipt"), "1");
});

test("toWhatsAppNumber converts Malawi numbers", () => {
  assert.equal(toWhatsAppNumber("0999 25 16 82"), "265999251682");
  assert.equal(toWhatsAppNumber("+265 885 52 66 88"), "265885526688");
  assert.equal(toWhatsAppNumber("00265999251682"), "265999251682");
  assert.equal(toWhatsAppNumber("123"), "");
  assert.equal(toWhatsAppNumber(""), "");
});
