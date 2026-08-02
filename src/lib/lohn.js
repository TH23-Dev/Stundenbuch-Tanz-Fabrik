// Lohnstunden je Kursdauer (Regel 2 aus BRIEFING.md): 55' = 1.0, 85' = 1.5
export const LOHNSTUNDEN = { 55: 1.0, 85: 1.5 };
export const std = (dauerMin) => LOHNSTUNDEN[dauerMin] || 1;

// Schweizer Format: 1'234.50
export const chf = (n) => (n || 0).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
