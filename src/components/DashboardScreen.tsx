import React from "react";
import { useApp } from "../context/AppContext";
import { calculateTotals, getDaysRemaining, formatCurrency, formatReadableDate } from "../utils";
import { Plus, ShieldCheck, TrendingDown, ArrowUpRight, AlertTriangle, Calendar, Star, Info, Moon, Bell } from "lucide-react";
import { AppLogo } from "./AppLogo";

export default function DashboardScreen() {
  const { subscriptions, profile, setScreen, setSelectedSubId, setTab } = useApp();

  const activeSubscriptions = subscriptions.filter(s => s.status === "active");
  const inactiveSubscriptions = subscriptions.filter(s => s.status === "paused" || s.status === "canceled");

  // Calculate totals
  const { monthlyTotal, yearlyTotal } = calculateTotals(subscriptions);

  // Find next upcoming charge
  let nextChargeSub = null;
  let nextChargeDays = Infinity;

  activeSubscriptions.forEach(sub => {
    const days = getDaysRemaining(sub.nextChargeDate);
    if (days >= 0 && days < nextChargeDays) {
      nextChargeDays = days;
      nextChargeSub = sub;
    }
  });

  // Calculate money saved from inactive/paused subs
  const moneySavedMonthly = inactiveSubscriptions.reduce((acc, sub) => {
    let monthlyCost = sub.amount;
    if (sub.billingCycle === "weekly") monthlyCost = (sub.amount * 52) / 12;
    else if (sub.billingCycle === "quarterly") monthlyCost = sub.amount / 3;
    else if (sub.billingCycle === "yearly") monthlyCost = sub.amount / 12;
    return acc + monthlyCost;
  }, 0);

  // Sort active subscriptions by next charge date
  const sortedUpcoming = [...activeSubscriptions].sort((a, b) => {
    return getDaysRemaining(a.nextChargeDate) - getDaysRemaining(b.nextChargeDate);
  });

  // Handle opening sub details
  const handleOpenDetails = (id: string) => {
    setSelectedSubId(id);
    setScreen("details");
  };

  // If there are no subscriptions, render the Empty State
  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-5 justify-between select-none pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 pt-4">
          <AppLogo className="h-8" />
          <span className="font-mono text-[8.5px] bg-slate-100/80 border border-slate-200 py-1 px-2.5 rounded-lg text-slate-500 font-bold uppercase whitespace-nowrap shrink-0">
            {profile?.isPremium ? "★ PREMIUM" : "FREE PLAN"}
          </span>
        </div>

        {/* Empty State Card */}
        <div className="my-auto max-w-sm mx-auto w-full text-center py-8">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xl flex flex-col gap-5 items-center">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
              <Calendar size={28} className="text-slate-600" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="font-display font-extrabold text-lg text-slate-900">No subscriptions added yet</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-normal">
                Let's make sure you stay on top of your bills! Add your streaming, gym, or software subscriptions manually.
              </p>
            </div>

            <button
              id="empty-add-first-btn"
              onClick={() => setScreen("add")}
              className="w-full bg-slate-900 text-white py-3 px-4 font-display font-bold text-xs rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={14} className="stroke-[2.5px]" />
              Add Your First Subscription
            </button>

            {/* Privacy note */}
            <div className="flex gap-1.5 items-start text-left bg-slate-50 border border-dashed border-slate-200 p-2.5 rounded-xl w-full mt-2">
              <ShieldCheck size={16} className="text-slate-900 shrink-0" />
              <span className="font-mono text-[9.5px] leading-snug text-slate-500">
                <strong>Privacy Protected:</strong> No banking logins required. Your entries remain entirely offline and manual.
              </span>
            </div>
          </div>
        </div>

        {/* Floating suggestion card */}
        <div className="max-w-sm mx-auto w-full text-center">
          <button
            id="empty-onboard-retry-btn"
            onClick={() => setTab("subscriptions")}
            className="text-xs font-mono text-slate-500 hover:text-slate-900 hover:underline cursor-pointer"
          >
            Or browse preset subscription templates →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-5 pb-24 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pt-4 border-b border-slate-200 pb-3 mb-5">
        <AppLogo className="h-8" />
        <div className="flex items-center gap-1 shrink-0">
          {!profile?.isPremium && (
            <button
              id="dash-upgrade-badge"
              onClick={() => setScreen("plan")}
              className="font-mono text-[8.5px] bg-slate-900 text-white border border-slate-900 py-1 px-2 rounded-lg hover:bg-slate-800 font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Unlock Premium
            </button>
          )}
          <span className={`font-mono text-[8.5px] py-1 px-2 rounded-lg font-bold uppercase whitespace-nowrap ${
            profile?.isPremium ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}>
            {profile?.isPremium ? "★ PREMIUM" : "FREE PLAN"}
          </span>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Monthly Expense */}
        <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider">Est. Monthly</span>
          <span className="font-sans text-xl font-black text-slate-900 mt-1">
            {formatCurrency(monthlyTotal)}
          </span>
          <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1.5 font-mono">
            <TrendingDown size={10} />
            <span>manual projection</span>
          </div>
        </div>

        {/* Yearly Expense */}
        <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider">Est. Yearly</span>
          <span className="font-sans text-xl font-black text-slate-900 mt-1">
            {formatCurrency(yearlyTotal)}
          </span>
          <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1.5 font-mono">
            <ArrowUpRight size={10} />
            <span>cumulative cost</span>
          </div>
        </div>
      </div>

      {/* Upcoming Reminders Alert Banner if next charge is within 3 days */}
      {nextChargeSub && nextChargeDays <= 3 && nextChargeDays >= 0 && (
        <div className="bg-amber-50 text-amber-900 border border-amber-200 p-4 mb-5 rounded-xl flex gap-2.5 items-start">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-display font-bold text-xs text-amber-950">Renewal Alert!</h4>
            <p className="text-[10px] leading-snug text-amber-850 mt-0.5">
              <strong>{(nextChargeSub as any).name}</strong> will charge <strong>{formatCurrency((nextChargeSub as any).amount)}</strong> {nextChargeDays === 0 ? "today" : nextChargeDays === 1 ? "tomorrow" : `in ${nextChargeDays} days`}.
            </p>
          </div>
          <button
            id="dash-alert-btn"
            onClick={() => handleOpenDetails((nextChargeSub as any).id)}
            className="text-[9px] font-mono font-bold uppercase underline text-amber-900 hover:text-slate-950 cursor-pointer self-center"
          >
            Review
          </button>
        </div>
      )}

      {/* Main Single Upcoming Charge banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md mb-5 hover:bg-slate-950 transition-colors">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">Next Recurring Charge</span>
            {nextChargeSub ? (
              <>
                <h3 className="font-display font-bold text-lg mt-1">{(nextChargeSub as any).name}</h3>
                <span className="font-mono font-black text-xl text-emerald-400">
                  {formatCurrency((nextChargeSub as any).amount)} <span className="text-[10px] font-normal text-slate-400">/ {(nextChargeSub as any).billingCycle}</span>
                </span>
              </>
            ) : (
              <h3 className="font-display font-bold text-sm mt-1 text-slate-400">No upcoming charges</h3>
            )}
          </div>
          
          <div className="bg-white/10 text-white font-mono text-[9px] font-bold py-1 px-2.5 rounded-lg border border-white/10 uppercase tracking-wider">
            {nextChargeSub ? (
              nextChargeDays === 0 ? "TODAY" : nextChargeDays === 1 ? "TOMORROW" : `IN ${nextChargeDays} DAYS`
            ) : (
              "N/A"
            )}
          </div>
        </div>
        {nextChargeSub && (
          <div className="flex justify-between items-center border-t border-slate-800 mt-3 pt-3 text-[10px] font-mono text-slate-400">
            <span>Due on {formatReadableDate((nextChargeSub as any).nextChargeDate)}</span>
            <button
              id="dash-quick-view-next-btn"
              onClick={() => handleOpenDetails((nextChargeSub as any).id)}
              className="text-emerald-400 hover:underline hover:text-emerald-300 cursor-pointer text-[9.5px] uppercase font-bold"
            >
              Manage Entry →
            </button>
          </div>
        )}
      </div>

      {/* Money Saved Motivating Card */}
      <div className="bg-white border border-dashed border-slate-200 p-4 rounded-xl flex gap-3 items-center mb-5 hover:shadow-xs transition-all">
        <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center shrink-0 border border-slate-100">
          <TrendingDown size={18} className="text-slate-600" />
        </div>
        <div className="flex-1">
          <span className="font-mono text-[8px] text-slate-400 uppercase font-bold tracking-wider">Manual Expense Shield</span>
          <h4 className="font-display font-bold text-xs text-slate-900">
            {moneySavedMonthly > 0 ? "You're cutting down expenses!" : "Keep subscription clutter low"}
          </h4>
          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
            {moneySavedMonthly > 0 
              ? `By pausing or canceling subscriptions, you are saving ${formatCurrency(moneySavedMonthly)}/month!`
              : "Review subscriptions regularly and pause or cancel those you aren't actively using."}
          </p>
        </div>
      </div>

      {/* Upcoming list section */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <h2 className="font-display font-bold text-sm text-slate-900">Upcoming Renewals ({activeSubscriptions.length})</h2>
          <button
            id="dash-view-all-btn"
            onClick={() => setTab("subscriptions")}
            className="font-mono text-[10px] font-bold text-slate-400 hover:text-slate-950 underline cursor-pointer"
          >
            View All
          </button>
        </div>

        {/* Subscription lists */}
        <div className="flex flex-col gap-2">
          {sortedUpcoming.slice(0, 3).map(sub => {
            const days = getDaysRemaining(sub.nextChargeDate);
            return (
              <div
                id={`dash-sub-row-${sub.id}`}
                key={sub.id}
                onClick={() => handleOpenDetails(sub.id)}
                className="bg-white border border-slate-150 p-3 rounded-xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex justify-between items-center hover:border-slate-300"
              >
                <div className="flex flex-col gap-0.5">
                  <h4 className="font-display font-bold text-xs text-slate-900">{sub.name}</h4>
                  <div className="flex gap-2 items-center text-[10px] text-slate-400 font-mono">
                    <span>{sub.category}</span>
                    <span>•</span>
                    <span>{formatReadableDate(sub.nextChargeDate)}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col gap-1 items-end">
                  <span className="font-mono font-bold text-xs text-slate-950">
                    {formatCurrency(sub.amount)}
                  </span>
                  <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-lg border uppercase ${
                    days <= 3 
                      ? "bg-rose-50 text-rose-700 border-rose-200 font-extrabold" 
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>
                    {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                  </span>
                </div>
              </div>
            );
          })}
          {sortedUpcoming.length > 3 && (
            <button
              id="dash-expand-more-btn"
              onClick={() => setTab("subscriptions")}
              className="text-center font-mono text-[10px] text-slate-500 hover:text-slate-950 font-bold py-2 bg-white border border-dashed border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              + {sortedUpcoming.length - 3} more active subscriptions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
