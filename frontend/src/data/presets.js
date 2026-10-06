// EdiTech rate card. Edit prices here and both the receipt and quotation forms update.
export const PRESETS = [
  { purpose: "Poster / Flyer", price: 10000 },
  { purpose: "Banners", price: 15000 },
  { purpose: "Product Labels / Sticker", price: 10000 },
  { purpose: "Menu Design", price: 10000 },
  { purpose: "Book Cover", price: 10000 },
  { purpose: "Music Cover", price: 10000 },
  { purpose: "Business Card", price: 10000 },
  { purpose: "Invoice & Letter Head", price: 12000 },
  { purpose: "Calendar", price: 15000 },
  { purpose: "T-Shirt & Golf Shirt", price: 10000 },
  { purpose: "Invitation Cards", price: 10000 },
  { purpose: "Company Logo", price: 20000 },
];

export const presetLabel = (p) => `${p.purpose} (MWK ${p.price.toLocaleString("en-US")})`;
