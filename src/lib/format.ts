export const money = (n: number) => `$${n.toFixed(2)}`;

export const shortDate = (s: string) => s;

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const isoDateToShort = (value: string) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

export const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

// Listing source badges are derived from the link's address instead of a field of their own.
export const sourceFromUrl = (url: string) => {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = "";
  }
  return host.includes("aliexpress") ? "AliExpress" : host.includes("amazon") ? "Amazon" : host.includes("alibaba") ? "Alibaba" : "Other";
};

export const statusClass = (s: string) => s.toLowerCase().replaceAll(" ", "-");
