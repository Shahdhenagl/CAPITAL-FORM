// Normalizes a phone number to international digits for wa.me links.
// Defaults Egyptian local numbers (starting with 0) to +20.
export function normalizeWhatsApp(raw) {
  if (!raw) return "";
  let n = String(raw).replace(/[^\d+]/g, "");
  n = n.replace(/^\+/, "");
  if (n.startsWith("00")) n = n.slice(2);
  // Egyptian local format: 01xxxxxxxxx -> 201xxxxxxxxx
  if (n.startsWith("0")) n = "20" + n.slice(1);
  return n;
}

export function waLink(raw, text) {
  const num = normalizeWhatsApp(raw);
  const base = `https://wa.me/${num}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
