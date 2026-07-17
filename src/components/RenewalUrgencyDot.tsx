import React from "react";

// Lightweight, standalone color-coded dot indicating how soon a subscription renews.
// Kept as its own small component (rather than inline in ListScreen.tsx) so it can be
// dropped into other screens later (Dashboard, Details, etc.) without duplicating the
// color-tier logic. Purely presentational — takes plain values in, renders a span, no
// data-model or context dependency.
//
// Color tiers intentionally match the existing ≤3-day "urgent" threshold already used
// elsewhere in the app (DashboardScreen.tsx's upcoming-renewals badge and
// DetailsScreen.tsx's countdown text), so red keeps the same meaning everywhere:
//   red    = renews within 3 days
//   amber  = renews within a week
//   green  = renews later than a week out
//   gray   = not applicable (paused/canceled subscription, or an unparseable date)
export default function RenewalUrgencyDot({ days, isActive }: { days: number; isActive: boolean }) {
  // Graceful degradation: only compute an urgency color for active subscriptions with
  // a valid day count. getDaysRemaining() can return NaN for a missing/malformed
  // nextChargeDate, and urgency isn't meaningful for a paused/canceled subscription —
  // both cases fall back to a neutral gray dot instead of guessing.
  const hasValidUrgency = isActive && !isNaN(days);

  let colorClass = "bg-slate-300";
  let label = "Renewal date unavailable";

  if (hasValidUrgency) {
    if (days <= 3) {
      colorClass = "bg-rose-500";
    } else if (days <= 7) {
      colorClass = "bg-amber-400";
    } else {
      colorClass = "bg-emerald-500";
    }
    label = days <= 0 ? "Renews today or overdue" : `Renews in ${days} day${days === 1 ? "" : "s"}`;
  }

  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${colorClass}`}
      title={label}
      aria-label={label}
    />
  );
}
