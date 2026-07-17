import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { PRESET_SERVICES, CATEGORIES, REMINDER_OPTIONS } from "../data";
import { formatCurrency } from "../utils";
import { findMerchantMatch, SUGGESTED_BILLING_CYCLES, MerchantMatch } from "../lib/merchantAutofill";
import { ChevronLeft, Save, X, Sparkles, AlertCircle, Info } from "lucide-react";
import { Subscription, SubscriptionCategory, BillingCycle, ReminderTiming } from "../types";

export default function AddEditScreen() {
  const { 
    subscriptions, 
    profile, 
    addSubscription, 
    editSubscription, 
    selectedSubscriptionId, 
    setSelectedSubId, 
    setScreen, 
    setTab 
  } = useApp();

  // Mode identification
  const isEditMode = !!selectedSubscriptionId;
  const editingSub = isEditMode ? subscriptions.find(s => s.id === selectedSubscriptionId) : null;

  // Form State
  const [name, setName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [nextChargeDate, setNextChargeDate] = useState<string>("");
  const [isFreeTrial, setIsFreeTrial] = useState<boolean>(false);
  const [freeTrialEndDate, setFreeTrialEndDate] = useState<string>("");
  const [reminderTiming, setReminderTiming] = useState<ReminderTiming>("1_day_before");
  const [category, setCategory] = useState<SubscriptionCategory>("Streaming");
  const [notes, setNotes] = useState<string>("");

  // Error/Success Notification
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Merchant autofill suggestion (src/lib/merchantAutofill.ts) — purely additive UI
  // state. It never mutates name/amount/category/billingCycle on its own; the user
  // must tap "Apply" on the banner below, so it can't clobber anything they've typed.
  const [autofillSuggestion, setAutofillSuggestion] = useState<MerchantMatch | null>(null);

  // Load existing values if in Edit Mode
  useEffect(() => {
    if (isEditMode && editingSub) {
      setName(editingSub.name);
      setAmount(editingSub.amount.toString());
      setBillingCycle(editingSub.billingCycle);
      setNextChargeDate(editingSub.nextChargeDate);
      setIsFreeTrial(editingSub.isFreeTrial);
      setFreeTrialEndDate(editingSub.freeTrialEndDate || "");
      setReminderTiming(editingSub.reminderTiming);
      setCategory(editingSub.category);
      setNotes(editingSub.notes || "");
      setAutofillSuggestion(null);
    } else {
      // Clear form for Add Mode
      setName("");
      setAmount("");
      setBillingCycle("monthly");
      // Set tomorrow's date as default next charge
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNextChargeDate(tomorrow.toISOString().split("T")[0]);
      setIsFreeTrial(false);
      setFreeTrialEndDate("");
      setReminderTiming("1_day_before");
      setCategory("Streaming");
      setNotes("");
      setAutofillSuggestion(null);
    }
  }, [isEditMode, editingSub]);

  // Autofill form from popular presets
  const handleApplyPreset = (preset: typeof PRESET_SERVICES[0]) => {
    setName(preset.name);
    setAmount(preset.amount.toString());
    setBillingCycle(preset.billingCycle);
    setCategory(preset.category);
    setError(null);
  };

  const handleCancel = () => {
    setSelectedSubId(null);
    if (isEditMode) {
      setScreen("details");
    } else {
      setTab("home");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validation
    if (!name.trim()) {
      setError("Please specify a subscription service name.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      setError("Please enter a valid amount (greater than or equal to 0).");
      return;
    }

    if (!nextChargeDate) {
      setError("Please specify the next recurring charge date.");
      return;
    }

    setLoading(true);

    try {
      const fields = {
        name: name.trim(),
        amount: numericAmount,
        billingCycle,
        nextChargeDate,
        isFreeTrial,
        freeTrialEndDate: isFreeTrial && freeTrialEndDate ? freeTrialEndDate : undefined,
        reminderTiming,
        category,
        notes: notes.trim() || undefined,
        status: (editingSub?.status || "active") as "active" | "paused" | "canceled"
      };

      if (isEditMode) {
        await editSubscription(selectedSubscriptionId!, fields);
        setScreen("details");
      } else {
        await addSubscription(fields);
        setTab("home");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while saving the subscription ledger.");
    } finally {
      setLoading(false);
    }
  };

  // Limit check indicator
  const hasReachedFreeLimit = !profile?.isPremium && subscriptions.length >= 5 && !isEditMode;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-5 pb-24 select-none">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pt-4 pb-3 border-b border-slate-200 mb-4">
        <button
          id="addedit-back-btn"
          onClick={handleCancel}
          className="flex items-center gap-1 text-xs font-mono font-bold text-slate-600 hover:text-slate-950 cursor-pointer"
        >
          <ChevronLeft size={14} />
          {isEditMode ? "Cancel Edit" : "Back Home"}
        </button>
        <span className="font-display font-extrabold text-sm text-slate-950 uppercase">
          {isEditMode ? "Edit Subscription" : "Add Subscription"}
        </span>
        <span className="font-mono text-[9px] bg-white border border-slate-200 px-2.5 py-0.5 text-slate-500 rounded-md">
          MANUAL ENTRY
        </span>
      </div>

      {/* Warning if free plan limit is reached */}
      {hasReachedFreeLimit ? (
        <div className="my-auto max-w-sm mx-auto w-full text-center">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-md flex flex-col gap-4 items-center">
            <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-150">
              <AlertCircle size={24} className="text-slate-700" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="font-display font-bold text-base text-slate-900">Free Plan Limit Reached</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You are tracking <strong>{subscriptions.length}</strong> subscription accounts. The free ledger supports up to 5 manual entries.
              </p>
            </div>

            <button
              id="addedit-upgrade-btn"
              onClick={() => setScreen("plan")}
              className="w-full bg-slate-900 text-white py-2.5 px-4 font-display font-bold text-xs rounded-xl shadow-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Unlock Premium for Unlimited Tracking
            </button>
            
            <button
              id="addedit-return-btn"
              onClick={handleCancel}
              className="text-xs font-mono font-bold underline text-slate-500 hover:text-slate-950 cursor-pointer"
            >
              Return to dashboard
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 max-w-sm mx-auto w-full flex flex-col gap-4">
          
          {/* Quick presets list for Add Mode */}
          {!isEditMode && (
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Sparkles size={14} className="text-slate-950" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Fast Presets Picker</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Select a template below to automatically configure name, default monthly price, and category.
              </p>
              
              <div className="flex gap-2 overflow-x-auto py-1.5 -mx-1 px-1 scrollbar-thin">
                {PRESET_SERVICES.map((p) => (
                  <button
                    id={`preset-btn-${p.name.replace(/\s+/g, '-').toLowerCase()}`}
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="shrink-0 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1 px-2.5 text-[10px] font-mono font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {p.name} ({formatCurrency(p.amount)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Core Form Card */}
          <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-md">
            {error && (
              <div className="bg-rose-50 text-rose-700 p-3 mb-4 border border-rose-200 text-xs font-mono flex items-start gap-1.5 rounded-xl">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {/* Service Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Service Name</label>
                <input
                  id="addedit-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setName(value);
                    // Merchant autofill: only suggest in Add mode (never in Edit mode,
                    // so opening an existing subscription can't surface an unrelated
                    // suggestion banner over already-saved data).
                    setAutofillSuggestion(isEditMode ? null : findMerchantMatch(value));
                  }}
                  placeholder="e.g. Netflix Premium"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-300 font-sans shadow-xs transition-colors"
                  required
                />
                {/* Non-intrusive merchant-autofill suggestion — informational until the
                    user explicitly taps "Apply"; dismissible; never blocks typing/submit. */}
                {autofillSuggestion && (
                  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 animate-fade-in">
                    <span className="text-[10px] text-slate-600 font-mono leading-snug">
                      Matched <strong className="text-slate-900">{autofillSuggestion.matchedName}</strong> — {autofillSuggestion.category}, {autofillSuggestion.billingCycle}, {formatCurrency(autofillSuggestion.amount)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id="addedit-autofill-apply-btn"
                        type="button"
                        onClick={() => {
                          setAmount(autofillSuggestion.amount.toString());
                          setBillingCycle(autofillSuggestion.billingCycle);
                          setCategory(autofillSuggestion.category);
                          setAutofillSuggestion(null);
                        }}
                        className="text-[10px] font-mono font-bold text-slate-900 underline cursor-pointer"
                      >
                        Apply
                      </button>
                      <button
                        id="addedit-autofill-dismiss-btn"
                        type="button"
                        onClick={() => setAutofillSuggestion(null)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Price / Cycle Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                    Price ({profile?.currency || "USD"})
                  </label>
                  <input
                    id="addedit-amount-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-300 font-mono font-bold shadow-xs transition-colors"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Billing Cycle</label>
                  <select
                    id="addedit-cycle-select"
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-300 font-sans cursor-pointer h-9 shadow-xs transition-colors"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {/* Optional suggested-cycle quick-select — purely a shortcut for the
                      dropdown above, which remains the actual source of truth for
                      billingCycle. Clicking a chip just calls the same setBillingCycle
                      the dropdown uses; nothing else about the field changes. */}
                  <div className="flex gap-1">
                    {SUGGESTED_BILLING_CYCLES.map((opt) => (
                      <button
                        id={`addedit-cycle-suggest-${opt.value}`}
                        key={opt.value}
                        type="button"
                        onClick={() => setBillingCycle(opt.value)}
                        className={`flex-1 py-1 text-[9px] font-mono font-bold rounded-md border cursor-pointer transition-colors ${
                          billingCycle === opt.value
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category / Reminder Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Category</label>
                  <select
                    id="addedit-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-300 font-sans cursor-pointer h-9 shadow-xs transition-colors"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Alert Notification</label>
                  <select
                    id="addedit-reminder-select"
                    value={reminderTiming}
                    onChange={(e) => setReminderTiming(e.target.value as ReminderTiming)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-300 font-sans cursor-pointer h-9 shadow-xs transition-colors"
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Next Charge Date */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Next Charge Date</label>
                <input
                  id="addedit-date-input"
                  type="date"
                  value={nextChargeDate}
                  onChange={(e) => setNextChargeDate(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-300 font-mono cursor-pointer shadow-xs transition-colors"
                  required
                />
              </div>

              {/* Free Trial Toggle section */}
              <div className="border border-dashed border-slate-200 p-3 rounded-xl bg-slate-50/70 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-display font-bold text-xs text-slate-800">Free Trial Tracking</span>
                    <span className="font-mono text-[8.5px] text-slate-400">Track and get alerted before trials expire.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="addedit-trial-toggle"
                      type="checkbox"
                      checked={isFreeTrial}
                      onChange={(e) => setIsFreeTrial(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                {isFreeTrial && (
                  <div className="flex flex-col gap-1.5 mt-1.5 animate-fade-in">
                    <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Trial End Date</label>
                    <input
                      id="addedit-trial-date-input"
                      type="date"
                      value={freeTrialEndDate}
                      onChange={(e) => setFreeTrialEndDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer shadow-xs"
                      required={isFreeTrial}
                    />
                  </div>
                )}
              </div>

              {/* Optional Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Internal Notes</label>
                <textarea
                  id="addedit-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Password reset timeline, shared plan accounts, etc."
                  rows={2}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-300 font-sans shadow-xs resize-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-2">
                <button
                  id="addedit-cancel-form-btn"
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-white text-slate-700 py-2.5 px-4 font-mono font-bold text-xs border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="addedit-save-form-btn"
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 text-white py-2.5 px-4 font-display font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Save size={13} />
                  {loading ? "Saving..." : "Save Subscription"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
