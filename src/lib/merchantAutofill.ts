import { PRESET_SERVICES, CATEGORIES } from "../data";
import { SubscriptionCategory, BillingCycle } from "../types";

// Isolated helper/service for the manual-entry form's "merchant autofill" and
// "suggested renewal cycle" features. Kept in its own file (rather than inline in
// AddEditScreen.tsx) so the form component doesn't need to change to support it, and
// so this logic can be reused elsewhere (e.g. the Quick Add modal) without duplication.
//
// Deliberately reuses the EXISTING PRESET_SERVICES and CATEGORIES lists from
// src/data.ts instead of introducing a second, parallel merchant/icon dataset —
// there is no per-merchant icon field anywhere in the app today, so the "icon" this
// module returns is the matched subscription's CATEGORY icon (already used for
// category chips in OnboardingScreen.tsx), not a new brand-logo system.

export interface MerchantMatch {
  matchedName: string; // the canonical preset name that was matched, e.g. "Netflix"
  category: SubscriptionCategory;
  billingCycle: BillingCycle;
  amount: number;
  icon: string; // lucide-react icon name, resolved from CATEGORIES for the matched category
}

/**
 * Looks up a known merchant/service by the name the user is typing, against the
 * existing PRESET_SERVICES list. Matching is case-insensitive and accepts either an
 * exact name match or the typed text being a prefix of a known name (so "Net" already
 * narrows toward "Netflix" once at least 3 characters are typed — short strings are
 * skipped to avoid noisy false-positive matches while the user is still typing).
 *
 * Returns null when there's no confident match, or when the subscription lacks a
 * usable name — callers should treat that as "no suggestion available" and leave the
 * rest of the form untouched (this function never mutates form state itself).
 */
export function findMerchantMatch(typedName: string): MerchantMatch | null {
  const trimmed = typedName.trim().toLowerCase();
  if (trimmed.length < 3) return null;

  const preset = PRESET_SERVICES.find((p) => {
    const presetName = p.name.toLowerCase();
    return presetName === trimmed || presetName.startsWith(trimmed);
  });
  if (!preset) return null;

  const categoryMeta = CATEGORIES.find((c) => c.value === preset.category);

  return {
    matchedName: preset.name,
    category: preset.category,
    billingCycle: preset.billingCycle,
    amount: preset.amount,
    icon: categoryMeta?.icon || "Layers",
  };
}

// The three most common renewal cycles, offered as optional quick-select suggestions
// alongside the existing Billing Cycle dropdown. This is intentionally a short, fixed
// list (not all 4 BillingCycle values) since these three cover the vast majority of
// real-world subscriptions — "weekly" remains selectable via the existing dropdown,
// it's just not offered as a quick-suggestion chip.
export const SUGGESTED_BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Annual" },
  { value: "quarterly", label: "Quarterly" },
];
