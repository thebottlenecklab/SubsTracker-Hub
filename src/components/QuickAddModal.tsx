import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { findMerchantMatch, SUGGESTED_BILLING_CYCLES } from "../lib/merchantAutofill";
import { BillingCycle, SubscriptionCategory } from "../types";
import { X, Zap, AlertCircle } from "lucide-react";

// Lightweight "Quick Add" entry flow: only Service Name + Price are required. Every
// other Subscription field is filled with a sensible default (or a merchant-matched
// guess) so the record can be created in one tap. This is a SEPARATE component from
// the full AddEditScreen form — nothing in AddEditScreen.tsx was changed to support
// this, so the existing add/edit flow behaves exactly as it did before.
//
// Rendered as an overlay (see App.tsx), controlled by AppContext's showQuickAdd flag,
// the same pattern already used for the Stripe checkout modal in App.tsx.
export default function QuickAddModal() {
  const { profile, subscriptions, addSubscription, setShowQuickAdd } = useApp();

  const [name, setName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  // Defaults to monthly, the most common cycle — user can optionally override via the
  // suggestion chips below without needing the full form's dropdown.
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Same free-plan limit the full form enforces (AddEditScreen.tsx), checked here too
  // so Quick Add can't be used to bypass it.
  const hasReachedFreeLimit = !profile?.isPremium && subscriptions.length >= 5;

  // Non-intrusive merchant match: only used to preview/guess a category, never shown
  // as an error if it doesn't match — an unmatched name just falls back to "Other".
  const merchantMatch = findMerchantMatch(name);

  const handleClose = () => {
    setShowQuickAdd(false);
    setName("");
    setAmount("");
    setBillingCycle("monthly");
    setError(null);
  };

  const handleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a service name.");
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      setError("Please enter a valid price.");
      return;
    }

    setSaving(true);
    try {
      // Default next charge date to tomorrow, same convention AddEditScreen.tsx uses
      // for new subscriptions in full-form Add mode.
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const category: SubscriptionCategory = merchantMatch?.category || "Other";

      await addSubscription({
        name: name.trim(),
        amount: numericAmount,
        billingCycle,
        nextChargeDate: tomorrow.toISOString().split("T")[0],
        isFreeTrial: false,
        reminderTiming: "1_day_before", // same default as the full form
        category,
        status: "active",
      });

      handleClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save subscription.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-sm w-full border border-slate-150 animate-scale-up">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-slate-900">
            <Zap size={15} />
            <h3 className="font-display font-extrabold text-sm uppercase tracking-tight">Quick Add</h3>
          </div>
          <button
            id="quickadd-close-btn"
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-900 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mb-4">
          Just the name and price — you can fill in the rest later from the subscription's details screen.
        </p>

        {hasReachedFreeLimit ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>Free plan limit reached (5 subscriptions). Upgrade to Premium to add more.</span>
          </div>
        ) : (
          <form onSubmit={handleQuickSave} className="flex flex-col gap-3.5">
            {error && (
              <div className="bg-rose-50 text-rose-700 p-2.5 border border-rose-200 text-[11px] font-mono flex items-start gap-1.5 rounded-lg">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Service Name</label>
              <input
                id="quickadd-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Netflix"
                autoFocus
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans shadow-xs"
              />
              {/* Non-intrusive merchant-match preview — informational only, never blocks
                  submission and never overwrites anything the user hasn't confirmed. */}
              {merchantMatch && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Matched "{merchantMatch.matchedName}" — will file under {merchantMatch.category}.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                Price ({profile?.currency || "USD"})
              </label>
              <input
                id="quickadd-amount-input"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold shadow-xs"
              />
            </div>

            {/* Optional renewal-cycle suggestion chips — purely a convenience, defaults
                to Monthly if left untouched, so skipping this entirely is fine. */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Renewal Cycle (optional)</label>
              <div className="flex gap-1.5">
                {SUGGESTED_BILLING_CYCLES.map((opt) => (
                  <button
                    id={`quickadd-cycle-${opt.value}`}
                    key={opt.value}
                    type="button"
                    onClick={() => setBillingCycle(opt.value)}
                    className={`flex-1 py-1.5 px-2 text-[10px] font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                      billingCycle === opt.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="quickadd-save-btn"
              type="submit"
              disabled={saving}
              className="w-full bg-slate-900 text-white py-2.5 px-4 font-display font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 cursor-pointer mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save & Close"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
