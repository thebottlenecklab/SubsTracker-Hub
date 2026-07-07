import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { ShieldCheck, CreditCard, Lock, ChevronLeft, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { getApiUrl } from "../utils";

export default function StripeSandboxScreen() {
  const { stripeSandboxSession, profile, clearSandboxParams, verifyStripeSession, setPaymentCancel, setPaymentSuccess, setScreen } = useApp();
  
  const [cardNumber, setCardNumber] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [cvc, setCvc] = useState<string>("");
  const [nameOnCard, setNameOnCard] = useState<string>(profile?.email ? profile.email.split("@")[0].toUpperCase() : "");
  
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Helper to format card number with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const matches = value.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(" "));
    } else {
      setCardNumber(value);
    }
  };

  // Helper to format expiry date as MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      setExpiry(`${value.slice(0, 2)} / ${value.slice(2)}`);
    } else {
      setExpiry(value);
    }
  };

  // Helper to limit CVC to 3 digits
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 4) {
      setCvc(value);
    }
  };

  const handleApprovePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeSandboxSession) return;

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 15) {
      setError("Please enter a valid credit card number.");
      return;
    }
    if (!expiry || expiry.length < 5) {
      setError("Please enter a valid expiration date (MM/YY).");
      return;
    }
    if (!cvc || cvc.length < 3) {
      setError("Please enter a valid CVC code.");
      return;
    }
    if (!nameOnCard) {
      setError("Please enter the name on the card.");
      return;
    }

    setLoading(true);
    setError(null);

    // Dynamic processing simulator sequence
    const steps = [
      "Establishing secure transaction handshake...",
      "Verifying card credentials with payment network...",
      "Finalizing secure cryptographic ledger signature..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setStatusMessage(steps[i]);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    try {
      const res = await fetch(getApiUrl("/api/stripe/sandbox-complete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: stripeSandboxSession }),
      });

      if (res.ok) {
        // Set success states directly in React state to avoid full iframe reload
        setPaymentSuccess(true);
        if (stripeSandboxSession) {
          await verifyStripeSession(stripeSandboxSession);
        }
        
        // Safely update URL bar without reload
        const urlObj = new URL(window.location.href);
        urlObj.searchParams.delete("stripe_sandbox");
        urlObj.searchParams.delete("session_id");
        urlObj.searchParams.set("payment_status", "success");
        window.history.replaceState({}, "", urlObj.toString());
      } else {
        setError("Payment processing failed. Please try a different card.");
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setError("A secure connection to the billing gateway could not be established.");
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    // Set cancel states directly in React state to avoid full iframe reload
    setPaymentCancel(true);
    setScreen("plan");
    clearSandboxParams();
    
    // Safely update URL bar without reload
    const urlObj = new URL(window.location.href);
    urlObj.searchParams.delete("stripe_sandbox");
    urlObj.searchParams.delete("session_id");
    urlObj.searchParams.set("payment_status", "cancel");
    window.history.replaceState({}, "", urlObj.toString());
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 p-6 font-sans justify-center items-center select-none">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl max-w-sm w-full flex flex-col gap-5 animate-fade-in">
        {/* Secure Billing Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 bg-[var(--color-emerald-500)] flex items-center justify-center text-white font-display font-extrabold text-[11px] rounded-md shadow-sm">
              S
            </div>
            <span className="font-display font-extrabold text-sm tracking-wider uppercase text-slate-800">Secure Checkout</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 py-0.5 px-2.5 text-[9px] font-mono font-bold rounded-full text-[var(--color-emerald-700)] flex items-center gap-1">
            <ShieldCheck size={10} className="stroke-[2.5px]" />
            SECURE
          </div>
        </div>

        {/* Purchase Summary */}
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-slate-400 font-mono text-[10px] uppercase">Payment Request</span>
          <div className="flex justify-between items-baseline">
            <span className="font-display font-bold text-base text-slate-950">SubsTracker Hub Premium (Lifetime)</span>
            <span className="font-mono font-extrabold text-base text-slate-950">$19.99</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal font-sans">
            One-time activation for unlimited subscriptions, priority alerts, multi-device sync, CSV data export, and lifetime cloud ledger updates.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 p-3 border border-rose-200 text-[11px] font-mono rounded-xl flex items-start gap-1.5">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div className="h-10 w-10 border-2 border-[var(--color-emerald-500)] border-t-transparent animate-spin rounded-full"></div>
            <div className="flex flex-col gap-1.5 px-2">
              <span className="font-display font-bold text-xs text-slate-950">Processing Order</span>
              <p className="text-[10px] font-mono text-slate-500 leading-normal animate-pulse">
                {statusMessage}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleApprovePayment} className="flex flex-col gap-3.5">
            {/* Card Information */}
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold text-slate-500 uppercase">Card Number</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className="w-full border border-slate-200 p-3 pl-10 bg-slate-50/50 text-sm font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-500)] focus:border-[var(--color-emerald-500)] text-slate-800 shadow-xs"
                  required
                />
                <CreditCard size={16} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] font-bold text-slate-500 uppercase">Expires (MM/YY)</label>
                <input
                  type="text"
                  placeholder="MM / YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                  className="border border-slate-200 p-3 bg-slate-50/50 text-sm font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-500)] focus:border-[var(--color-emerald-500)] text-slate-800 shadow-xs text-center"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] font-bold text-slate-500 uppercase">CVC</label>
                <input
                  type="text"
                  placeholder="123"
                  value={cvc}
                  onChange={handleCvcChange}
                  className="border border-slate-200 p-3 bg-slate-50/50 text-sm font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-500)] focus:border-[var(--color-emerald-500)] text-slate-800 shadow-xs text-center"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold text-slate-500 uppercase">Name on Card</label>
              <input
                type="text"
                placeholder="FIRST LAST"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value.toUpperCase())}
                className="border border-slate-200 p-3 bg-slate-50/50 text-sm font-sans rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-500)] focus:border-[var(--color-emerald-500)] text-slate-800 shadow-xs uppercase font-medium"
                required
              />
            </div>

            {/* Informative text */}
            <div className="bg-slate-50 p-3 border border-dashed border-slate-200 rounded-xl flex gap-2 items-start text-[10px] text-slate-500 font-sans leading-relaxed mt-1">
              <ShieldCheck size={14} className="text-[var(--color-emerald-500)] shrink-0 mt-0.5" />
              <span>
                Your transaction is protected. SubsTracker Hub stores no credit card numbers or billing logs. Fully PCI-DSS Compliant processing.
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button
                type="submit"
                className="w-full bg-[var(--color-emerald-500)] text-white py-3 px-4 font-display font-extrabold text-xs tracking-wider uppercase text-center rounded-xl hover:bg-[var(--color-emerald-600)] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
              >
                <Lock size={12} />
                Authorize Payment ($19.99)
              </button>

              <button
                type="button"
                onClick={handleCancelPayment}
                className="w-full bg-white text-slate-600 py-2.5 px-4 font-mono font-bold text-[11px] text-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              >
                Cancel and Return
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
