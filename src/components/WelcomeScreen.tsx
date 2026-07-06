import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Lock, ChevronRight, Check, EyeOff, ShieldCheck, Zap } from "lucide-react";
import { AppLogo } from "./AppLogo";

export default function WelcomeScreen() {
  const { setScreen, enableLocalOnlyMode } = useApp();
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-6 justify-between select-none">
      {/* Top Header Logo */}
      <div className="flex items-center justify-between gap-3 pt-4">
        <AppLogo className="h-8" />
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 py-1.5 px-2.5 text-xs font-mono font-medium rounded-lg text-slate-700 whitespace-nowrap shrink-0">
          <EyeOff size={12} className="text-slate-900" />
          PRIVACY FIRST
        </div>
      </div>

      {/* Main Hero Section */}
      <div className="my-auto py-8">
        {!showHowItWorks ? (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="inline-flex self-start bg-slate-900 text-white px-3 py-1 text-[10px] font-mono font-medium tracking-wider uppercase rounded-full">
              Beta v1.0.0
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-none">
              Track subscriptions <br />
              <span className="bg-slate-900 text-white px-3.5 py-1.5 inline-block my-1 rounded-xl">without linking</span> <br />
              your bank.
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-sans max-w-md">
              A minimalist, manual expense planner built for privacy. We never ask for your banking logins, account passwords, or transaction history. Total control stays in your hands.
            </p>

            {/* Wireframe Feature Highlights */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white p-4 border border-slate-150 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-1.5">
                <ShieldCheck size={20} className="text-slate-900" />
                <span className="font-display font-bold text-xs text-slate-900">No Bank Linking</span>
                <span className="text-[10px] text-slate-500 leading-tight">100% manual entries, zero bank scraping algorithms.</span>
              </div>
              <div className="bg-white p-4 border border-slate-150 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-1.5">
                <Lock size={20} className="text-slate-900" />
                <span className="font-display font-bold text-xs text-slate-900">Offline Support</span>
                <span className="text-[10px] text-slate-500 leading-tight">Store data locally or back up to our encrypted cloud.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 animate-fade-in">
            <h2 className="font-display text-2xl font-bold border-b border-slate-200 pb-2">How It Works</h2>
            
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 items-start">
                <div className="bg-slate-900 text-white rounded-full h-6 w-6 flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-xs">1</div>
                <div>
                  <h3 className="font-display font-bold text-sm">Add Recurring Items Manually</h3>
                  <p className="text-xs text-slate-600">Enter your Netflix, Gym, or SaaS plan with prices, cycles, and next charge dates.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="bg-slate-900 text-white rounded-full h-6 w-6 flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-xs">2</div>
                <div>
                  <h3 className="font-display font-bold text-sm">Automated Cost Estimations</h3>
                  <p className="text-xs text-slate-600">Our engine automatically projects your upcoming monthly and yearly recurring expenditures.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="bg-slate-900 text-white rounded-full h-6 w-6 flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-xs">3</div>
                <div>
                  <h3 className="font-display font-bold text-sm">Timely Smart Reminders</h3>
                  <p className="text-xs text-slate-600">Set renewal or free trial termination notifications. We notify you before they bill you.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="bg-slate-900 text-white rounded-full h-6 w-6 flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-xs">4</div>
                <div>
                  <h3 className="font-display font-bold text-sm">Backup and Restores</h3>
                  <p className="text-xs text-slate-600">Optionally log in with an encrypted email to backup and synchronize across multiple devices.</p>
                </div>
              </div>
            </div>

            <button 
              id="back-to-welcome-btn"
              onClick={() => setShowHowItWorks(false)} 
              className="mt-2 text-xs font-mono font-bold underline text-slate-600 hover:text-slate-950 self-start"
            >
              ← Back to Overview
            </button>
          </div>
        )}
      </div>

      {/* Buttons & Footer */}
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            id="welcome-get-started-btn"
            onClick={() => setScreen("auth")}
            className="flex-1 bg-slate-900 text-white py-3.5 px-4 font-display font-bold text-center flex items-center justify-center gap-2 rounded-xl shadow-md hover:bg-slate-800 hover:shadow-lg transition-all cursor-pointer"
          >
            Get Started
            <ChevronRight size={16} />
          </button>

          {!showHowItWorks && (
            <button
              id="welcome-how-works-btn"
              onClick={() => setShowHowItWorks(true)}
              className="flex-1 bg-white text-slate-800 py-3.5 px-4 font-display font-bold text-center border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              See How It Works
            </button>
          )}
        </div>

        {/* Local mode option */}
        <button
          id="welcome-local-only-btn"
          onClick={enableLocalOnlyMode}
          className="text-center font-mono text-xs text-slate-500 hover:text-slate-900 hover:underline cursor-pointer py-1"
        >
          Or continue offline without account (Local Only Mode)
        </button>

        {/* Privacy Note */}
        <div className="border-t border-slate-200 pt-4 flex gap-2 items-start text-[11px] text-slate-500 font-mono leading-normal">
          <ShieldCheck size={14} className="shrink-0 text-slate-900 mt-0.5" />
          <span>
            <strong>Privacy Pledge:</strong> Your subscription data belongs exclusively to you. No bank integration, no data scraping, no advertising brokers. Secured with AES-256 equivalent standard credentials.
          </span>
        </div>
      </div>
    </div>
  );
}
