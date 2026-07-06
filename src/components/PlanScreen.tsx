import React from "react";
import { useApp } from "../context/AppContext";
import { PLAN_COMPARISON } from "../data";
import { Check, X, ShieldCheck, CreditCard, ChevronRight } from "lucide-react";

export default function PlanScreen() {
  const { unlockPremium, setScreen, profile, setProfileField, paymentError, clearSandboxParams } = useApp();

  const handleStartFree = async () => {
    // If user chooses free plan, just proceed to onboarding
    await setProfileField("isPremium", false);
    setScreen("onboarding");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-6 justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          id="plan-back-btn"
          onClick={() => {
            clearSandboxParams();
            setScreen("auth");
          }}
          className="text-xs font-mono font-bold text-slate-600 hover:text-slate-950 hover:underline cursor-pointer"
        >
          ← Back
        </button>
        <span className="font-mono text-[10px] text-slate-400">Step 3 of 4</span>
      </div>

      {/* Main Container */}
      <div className="my-auto py-4 max-w-sm mx-auto w-full">
        {paymentError && (
          <div className="bg-rose-50 text-rose-700 p-3.5 mb-4 border border-rose-200 text-[11px] font-sans rounded-xl flex items-start gap-1.5 relative animate-fade-in shadow-xs">
            <div className="flex-1">
              <strong className="font-bold">Checkout Attempt Failed:</strong>
              <p className="mt-1 font-mono text-[10px] bg-white/50 p-2 rounded-lg border border-rose-100 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {paymentError}
              </p>
            </div>
            <button 
              onClick={() => clearSandboxParams()} 
              className="text-rose-900 hover:text-slate-950 font-bold cursor-pointer ml-1 text-sm leading-none"
              title="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <div className="text-center mb-5">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 uppercase">
            Choose Your Plan
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-normal font-sans">
            No monthly subscriptions here. Pay once, own it forever.
          </p>
        </div>

        {/* Pricing Cards Row */}
        <div className="flex flex-col gap-4 mb-5">
          {/* Premium Card */}
          <div className="bg-white border border-slate-900 p-5 rounded-2xl shadow-md relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-slate-900 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg">
              BEST VALUE
            </div>
            
            <h3 className="font-display font-bold text-lg text-slate-950">Premium Lifetime</h3>
            <p className="text-xs text-slate-500 font-sans">One-time purchase. Free forever after.</p>
            
            <div className="flex items-baseline gap-1 my-2">
              <span className="font-mono font-extrabold text-3xl text-slate-900">$19.99</span>
              <span className="text-xs text-slate-500 font-mono">one-time payment</span>
            </div>

            <button
              id="plan-premium-btn"
              onClick={unlockPremium}
              className="w-full bg-slate-900 text-white py-2.5 px-4 font-display font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              <CreditCard size={12} />
              Unlock Premium Lifetime
            </button>
          </div>

          {/* Free Card */}
          <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-900">Free Basic Plan</h3>
              <p className="text-[10px] text-slate-500">Track up to 5 subscriptions locally.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-sm text-slate-900">$0.00</span>
              <button
                id="plan-free-btn"
                onClick={handleStartFree}
                className="bg-slate-100 text-slate-700 py-1.5 px-3.5 font-mono text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Start Free →
              </button>
            </div>
          </div>
        </div>

        {/* Comparison Matrix Header */}
        <div className="bg-slate-100 border border-slate-200 p-2 rounded-xl mb-3 text-center">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700">Detailed Plan Matrix</span>
        </div>

        {/* Comparison Table */}
        <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden max-h-60 overflow-y-auto mb-4 shadow-sm">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[9px] text-slate-500 uppercase">
                <th className="p-2">Feature Capability</th>
                <th className="p-2 text-center">Free</th>
                <th className="p-2 text-center">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PLAN_COMPARISON.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className="p-2 font-medium text-slate-800 text-[11px]">{row.feature}</td>
                  <td className="p-2 text-center text-slate-500 text-[10px]">
                    {row.free === "Yes" ? (
                      <Check size={14} className="mx-auto text-slate-900" />
                    ) : row.free === "No" ? (
                      <X size={14} className="mx-auto text-slate-400" />
                    ) : (
                      <span className="font-mono text-[9px]">{row.free}</span>
                    )}
                  </td>
                  <td className="p-2 text-center text-slate-900 font-semibold text-[10px]">
                    {row.premium === "Yes" ? (
                      <Check size={14} className="mx-auto text-slate-900" />
                    ) : (
                      <span className="font-mono text-[9px]">{row.premium}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Badging Footer */}
      <div className="border-t border-slate-200 pt-4 flex gap-2 items-center justify-center text-[10px] text-slate-500 font-mono">
        <ShieldCheck size={14} className="text-slate-900" />
        <span>Secured with Stripe Checkout. Cancel or modify anytime.</span>
      </div>
    </div>
  );
}
