import { Capacitor } from "@capacitor/core";
import { Subscription, BillingCycle } from "./types";

/**
 * Resolves a full absolute API endpoint URL when running inside a native/Capacitor context,
 * otherwise returns the relative path for standard web browsers.
 */
export function getApiUrl(path: string): string {
  // Capacitor's native WebView always serves the bundled app from a local
  // origin (e.g. https://localhost on Android, capacitor://localhost on iOS),
  // never a real remote host — so isNativePlatform() alone is sufficient here.
  if (Capacitor.isNativePlatform()) {
    // Read the configured VITE_APP_URL, defaulting to the Cloud Run server URL
    const configuredUrl = (import.meta as any).env?.VITE_APP_URL || "https://substracker-backend-409244064662.us-east1.run.app";
    const base = configuredUrl.endsWith("/") ? configuredUrl.slice(0, -1) : configuredUrl;
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${formattedPath}`;
  }
  return path;
}

// Maps a locale's region/country subtag to its most common currency. There is no
// built-in Intl API that infers a currency from a locale — Intl.NumberFormat's
// resolvedOptions().currency only echoes back whatever currency you explicitly pass
// in as an *input*, it never derives one. This lookup table is the standard
// workaround. Covers the primary market for every currency already offered in
// Settings' Regional Preferences dropdown, plus the other major English/Euro markets
// so common locales like en-GB, en-AU, de-DE, etc. resolve correctly.
const REGION_TO_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", NZ: "NZD",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR", AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR",
  JP: "JPY", IN: "INR", BR: "BRL", ZA: "ZAR", SG: "SGD", CN: "CNY", CH: "CHF", MX: "MXN",
  SE: "SEK", NO: "NOK", DK: "DKK", AE: "AED", SA: "SAR", TR: "TRY", KR: "KRW",
};

/**
 * Detects currency from the user's browser/device locale.
 *
 * BUG FIX: this previously always returned "USD" for every user regardless of their
 * actual locale — it tried Intl.NumberFormat().resolvedOptions().currency (which is
 * always undefined without an explicit currency style) and then
 * Intl.NumberFormat(locale, { currency: "USD" }).resolvedOptions().currency (which
 * just echoes back the USD it was explicitly told to use; locale only affects
 * formatting, not which currency gets picked). Now uses Intl.Locale to extract the
 * region subtag (e.g. "CA" from "en-CA") and looks it up in REGION_TO_CURRENCY.
 */
export function getAutoDetectedCurrency(): string {
  try {
    const locale = navigator.language || "en-US";
    // Intl.Locale.maximize() fills in a likely region even for a bare language tag
    // (e.g. "en" -> "en-Latn-US"), so this still resolves something reasonable even
    // when navigator.language doesn't include an explicit region.
    const region = new Intl.Locale(locale).maximize().region;
    if (region && REGION_TO_CURRENCY[region]) {
      return REGION_TO_CURRENCY[region];
    }
  } catch (e) {
    // Intl.Locale unsupported or locale parsing failed — fall through to default.
  }

  return "USD";
}

/**
 * Lifetime Premium unlock price per currency, as the actual human-readable amount —
 * e.g. 7.99 means $7.99, and for JPY/KRW (see ZERO_DECIMAL_CURRENCIES below) 1200
 * means literally ¥1200, not ¥12.00. Covers every currency offered in the "Default
 * Currency" Regional Preferences dropdown (SettingsScreen.tsx), so every currency a
 * user can select there actually gets used for the real Stripe charge, not just a
 * handful of major ones falling back to USD. These are fixed, intentional round-number
 * price points per market (not live FX conversion), so they avoid depending on an
 * external exchange-rate API and can be tuned independently per region.
 *
 * IMPORTANT: this table is duplicated in server.ts, which actually creates the Stripe
 * checkout session and can't share this module (client/server are separate bundles in
 * this project — server.ts already duplicates other client-side constants like the
 * Firebase config for the same reason). Keep both in sync when changing prices.
 */
export const PREMIUM_PRICE_BY_CURRENCY: Record<string, number> = {
  USD: 7.99,
  CAD: 10.99,
  EUR: 7.49,
  GBP: 6.49,
  JPY: 1200,
  AUD: 11.99,
  INR: 649,
  BRL: 39.90,
  ZAR: 149,
  SGD: 10.99,
  CNY: 49,
  CHF: 7.49,
  MXN: 149,
  NZD: 12.99,
  SEK: 79,
  NOK: 79,
  DKK: 54,
  AED: 29,
  SAR: 29,
  TRY: 249,
  KRW: 10000,
};

export const DEFAULT_PREMIUM_CURRENCY = "USD";

// Stripe's "zero-decimal" currencies have no cents/sub-unit — the API expects the
// whole-unit integer directly (e.g. unit_amount: 1200 for ¥1200), unlike every other
// currency here where unit_amount is in minor units (amount * 100). Of the currencies
// in PREMIUM_PRICE_BY_CURRENCY, only JPY and KRW fall into this category.
export const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW"]);

/**
 * Resolves the lifetime Premium price for a given currency code, falling back to USD
 * if the currency isn't in PREMIUM_PRICE_BY_CURRENCY. Returns the human-readable
 * amount alongside a locale-formatted display string for UI labels, so the price
 * shown to the user always matches what actually gets charged.
 */
export function getPremiumPrice(currency?: string): { currency: string; amount: number; display: string } {
  const resolvedCurrency = currency && PREMIUM_PRICE_BY_CURRENCY[currency] ? currency : DEFAULT_PREMIUM_CURRENCY;
  const amount = PREMIUM_PRICE_BY_CURRENCY[resolvedCurrency];
  return {
    currency: resolvedCurrency,
    amount,
    display: formatCurrency(amount, resolvedCurrency),
  };
}

/**
 * Formats a number as the user's preferred or detected local currency.
 */
export function formatCurrency(amount: number, overrideCurrency?: string): string {
  let currency = overrideCurrency;

  if (!currency) {
    try {
      const profileRaw = localStorage.getItem("substracker_profile");
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile && profile.currency) {
          currency = profile.currency;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!currency) {
    currency = getAutoDetectedCurrency();
  }

  try {
    const locale = navigator.language || "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(amount);
  } catch (e) {
    // Fallback if the currency code is unrecognized
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
}

/**
 * Normalizes subscription amount to its monthly cost equivalent.
 */
export function getMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "weekly":
      return (amount * 52) / 12;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "monthly":
    default:
      return amount;
  }
}

/**
 * Normalizes subscription amount to its yearly cost equivalent.
 */
export function getYearlyEquivalent(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "weekly":
      return amount * 52;
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    case "yearly":
    default:
      return amount;
  }
}

/**
 * Calculates total monthly and yearly costs of all active subscriptions.
 */
export function calculateTotals(subscriptions: Subscription[]) {
  const activeSubs = subscriptions.filter(sub => sub.status === "active");
  
  const monthlyTotal = activeSubs.reduce(
    (acc, sub) => acc + getMonthlyEquivalent(sub.amount, sub.billingCycle),
    0
  );
  
  const yearlyTotal = activeSubs.reduce(
    (acc, sub) => acc + getYearlyEquivalent(sub.amount, sub.billingCycle),
    0
  );

  return { monthlyTotal, yearlyTotal };
}

/**
 * Calculates how many days are left until a specific date (YYYY-MM-DD).
 */
export function getDaysRemaining(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  
  // Use UTC to avoid daylight saving offset issues
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Checks if a date is today.
 */
export function isToday(dateString: string): boolean {
  const todayStr = new Date().toISOString().split("T")[0];
  return dateString === todayStr;
}

/**
 * Formats a YYYY-MM-DD date string into a clean readable date (e.g., "Jun 30, 2026").
 */
export function formatReadableDate(dateString: string): string {
  if (!dateString) return "N/A";
  const [year, month, day] = dateString.split("-").map(Number);
  // Create date locally to prevent timezone shifting
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Writes a file and hands it to the platform's native "save/share" flow so it lands
 * on the user's device as a real file, rather than just being copied to the clipboard.
 *
 * On native Android/iOS builds, Android's scoped storage rules (API 29+) block apps
 * from silently writing into the public Downloads folder without either a storage
 * permission (which Play Store review flags for apps that don't need broad file
 * access) or going through the OS's native save/share UI. So we write the file to the
 * app's private cache dir via @capacitor/filesystem, then hand it to @capacitor/share,
 * which opens the native Android share sheet — the user picks "Files"/"Drive"/etc. to
 * save it, which is the standard permission-free pattern for this on Android.
 *
 * On the web (desktop browser preview), this triggers a normal anchor-click download.
 */
async function saveOrShareFile(filename: string, mimeType: string, content: { text?: string; base64?: string }): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");

    const writeResult = content.text !== undefined
      ? await Filesystem.writeFile({ path: filename, data: content.text, directory: Directory.Cache, encoding: Encoding.UTF8 })
      : await Filesystem.writeFile({ path: filename, data: content.base64 as string, directory: Directory.Cache });

    await Share.share({
      title: filename,
      url: writeResult.uri,
      dialogTitle: `Save ${filename}`
    });
    return;
  }

  const blob = content.text !== undefined
    ? new Blob([content.text], { type: mimeType })
    : new Blob([Uint8Array.from(atob(content.base64 as string), c => c.charCodeAt(0))], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a list of subscriptions as a CSV file, saving/sharing it via saveOrShareFile.
 */
export async function downloadCSV(subscriptions: Subscription[]): Promise<void> {
  const headers = [
    "Service Name",
    "Amount",
    "Billing Cycle",
    "Next Charge Date",
    "Free Trial",
    "Free Trial End Date",
    "Category",
    "Status",
    "Notes"
  ];

  const rows = subscriptions.map(sub => [
    `"${sub.name.replace(/"/g, '""')}"`,
    sub.amount,
    sub.billingCycle,
    sub.nextChargeDate,
    sub.isFreeTrial ? "Yes" : "No",
    sub.freeTrialEndDate || "",
    sub.category,
    sub.status,
    `"${(sub.notes || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");

  await saveOrShareFile(
    `SubsTracker_Hub_Backup_${new Date().toISOString().split('T')[0]}.csv`,
    "text/csv;charset=utf-8;",
    { text: csvContent }
  );
}

/**
 * Exports a list of subscriptions as a PDF ledger, saving/sharing it via saveOrShareFile.
 */
export async function downloadPDF(subscriptions: Subscription[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  const marginX = 14;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SubsTracker Hub - Subscription Ledger", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;
  doc.text(`Generated ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, marginX, y);
  y += 8;

  const headers = ["Service", "Amount", "Cycle", "Next Charge", "Category", "Status"];
  const colWidths = [42, 24, 22, 30, 32, 26];

  const drawRow = (cells: string[], bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    let x = marginX;
    cells.forEach((cell, i) => {
      doc.text(String(cell), x, y);
      x += colWidths[i];
    });
    y += 6;
  };

  drawRow(headers, true);
  doc.setLineWidth(0.2);
  doc.line(marginX, y - 4, marginX + colWidths.reduce((a, b) => a + b, 0), y - 4);

  subscriptions.forEach(sub => {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    drawRow([
      sub.name,
      sub.amount.toString(),
      sub.billingCycle,
      sub.nextChargeDate,
      sub.category,
      sub.status
    ]);
  });

  const base64 = doc.output("datauristring").split(",")[1];

  await saveOrShareFile(
    `SubsTracker_Hub_Backup_${new Date().toISOString().split('T')[0]}.pdf`,
    "application/pdf",
    { base64 }
  );
}

/**
 * Exports the full local JSON backup, saving/sharing it via saveOrShareFile.
 */
export async function downloadJSON(jsonStr: string): Promise<void> {
  await saveOrShareFile(
    `SubsTracker_Hub_Backup_${new Date().toISOString().split('T')[0]}.json`,
    "application/json",
    { text: jsonStr }
  );
}

export interface MonthlySpendItem {
  subscription: Subscription;
  occurrencesCount: number;
  billingDates: string[];
  cost: number;
}

export interface MonthlySpendBreakdown {
  monthIndex: number; // 0 to 11
  monthName: string;
  totalSpend: number;
  items: MonthlySpendItem[];
}

/**
 * Calculates scheduled subscription billing occurrences and costs across all 12 months for a year.
 */
export function getYearlySpendData(subscriptions: Subscription[], selectedYear: number): MonthlySpendBreakdown[] {
  const fullMonthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const activeSubs = subscriptions.filter(sub => sub.status === "active");

  return fullMonthNames.map((monthName, monthIdx) => {
    const items: MonthlySpendItem[] = [];
    let totalSpend = 0;

    activeSubs.forEach(sub => {
      const parts = sub.nextChargeDate.split("-");
      if (parts.length !== 3) return;
      const subYear = parseInt(parts[0], 10);
      const subMonth = parseInt(parts[1], 10) - 1;
      const subDay = parseInt(parts[2], 10);
      const anchor = new Date(subYear, subMonth, subDay);
      
      let occurrencesCount = 0;
      const billingDates: string[] = [];

      if (sub.billingCycle === "weekly") {
        const endOfMonth = new Date(selectedYear, monthIdx + 1, 0);

        for (let d = 1; d <= endOfMonth.getDate(); d++) {
          const currentDay = new Date(selectedYear, monthIdx, d);
          const diffTime = currentDay.getTime() - anchor.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays % 7 === 0 && diffDays >= 0) {
            occurrencesCount++;
            const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            billingDates.push(dateStr);
          }
        }
      } else if (sub.billingCycle === "monthly") {
        const anchorMonthsTotal = anchor.getFullYear() * 12 + anchor.getMonth();
        const targetMonthsTotal = selectedYear * 12 + monthIdx;

        if (targetMonthsTotal >= anchorMonthsTotal) {
          occurrencesCount = 1;
          const lastDayOfTargetMonth = new Date(selectedYear, monthIdx + 1, 0).getDate();
          const billingDay = Math.min(anchor.getDate(), lastDayOfTargetMonth);
          const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(billingDay).padStart(2, "0")}`;
          billingDates.push(dateStr);
        }
      } else if (sub.billingCycle === "quarterly") {
        const anchorMonthsTotal = anchor.getFullYear() * 12 + anchor.getMonth();
        const targetMonthsTotal = selectedYear * 12 + monthIdx;
        const diffMonths = targetMonthsTotal - anchorMonthsTotal;

        if (diffMonths >= 0 && diffMonths % 3 === 0) {
          occurrencesCount = 1;
          const lastDayOfTargetMonth = new Date(selectedYear, monthIdx + 1, 0).getDate();
          const billingDay = Math.min(anchor.getDate(), lastDayOfTargetMonth);
          const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(billingDay).padStart(2, "0")}`;
          billingDates.push(dateStr);
        }
      } else if (sub.billingCycle === "yearly") {
        const anchorMonthsTotal = anchor.getFullYear() * 12 + anchor.getMonth();
        const targetMonthsTotal = selectedYear * 12 + monthIdx;

        if (targetMonthsTotal >= anchorMonthsTotal && monthIdx === anchor.getMonth()) {
          occurrencesCount = 1;
          const lastDayOfTargetMonth = new Date(selectedYear, monthIdx + 1, 0).getDate();
          const billingDay = Math.min(anchor.getDate(), lastDayOfTargetMonth);
          const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(billingDay).padStart(2, "0")}`;
          billingDates.push(dateStr);
        }
      }

      if (occurrencesCount > 0) {
        const cost = sub.amount * occurrencesCount;
        totalSpend += cost;
        items.push({
          subscription: sub,
          occurrencesCount,
          billingDates,
          cost
        });
      }
    });

    items.sort((a, b) => b.cost - a.cost);

    return {
      monthIndex: monthIdx,
      monthName,
      totalSpend,
      items
    };
  });
}
