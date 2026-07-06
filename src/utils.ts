import { Subscription, BillingCycle } from "./types";

/**
 * Dynamically detects currency from the user's browser location / locale settings.
 */
export function getAutoDetectedCurrency(): string {
  try {
    const currency = new Intl.NumberFormat().resolvedOptions().currency;
    if (currency) return currency;
  } catch (e) {
    // ignore
  }

  try {
    const locale = navigator.language || "en-US";
    const formatter = new Intl.NumberFormat(locale, { style: "currency", currency: "USD" });
    const resolved = formatter.resolvedOptions().currency;
    if (resolved) return resolved;
  } catch (e) {
    // ignore
  }

  return "USD";
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
 * Exports a list of subscriptions as a CSV file.
 */
export function downloadCSV(subscriptions: Subscription[]) {
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

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `SubsTracker_Hub_Backup_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
