import React from "react";
import { Capacitor } from "@capacitor/core";
import { AppProvider, useApp } from "./context/AppContext";
import WelcomeScreen from "./components/WelcomeScreen";
import AuthScreen from "./components/AuthScreen";
import PlanScreen from "./components/PlanScreen";
import OnboardingScreen from "./components/OnboardingScreen";
import StripeSandboxScreen from "./components/StripeSandboxScreen";
import DashboardScreen from "./components/DashboardScreen";
import AddEditScreen from "./components/AddEditScreen";
import ListScreen from "./components/ListScreen";
import CalendarScreen from "./components/CalendarScreen";
import DetailsScreen from "./components/DetailsScreen";
import SettingsScreen from "./components/SettingsScreen";
import MetricsScreen from "./components/MetricsScreen";
import BottomNav from "./components/BottomNav";
import QuickAddModal from "./components/QuickAddModal";
import { CheckCircle2, AlertTriangle, X, ShieldAlert, Sparkles, CreditCard, ExternalLink, ShieldCheck, Info } from "lucide-react";

function StatusBarTime() {
  const [time, setTime] = React.useState("9:41");

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const formattedHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      setTime(`${formattedHours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return <>{time}</>;
}

function AppContent() {
  const { 
    currentScreen, 
    activeTab, 
    loading, 
    paymentSuccess, 
    paymentCancel, 
    clearSandboxParams,
    profile,
    stripeCheckoutUrl,
    setStripeCheckoutUrl,
    stripeCheckoutSessionId,
    verifyStripeSession,
    showQuickAdd
  } = useApp();

  const [verifying, setVerifying] = React.useState(false);
  const [verificationResult, setVerificationResult] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className={`flex flex-col min-h-screen bg-slate-50 text-slate-900 justify-center items-center font-mono ${profile?.theme ? `theme-${profile.theme}` : "theme-forest"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-slate-900 border-t-transparent animate-spin rounded-full"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Syncing Ledger...</span>
        </div>
      </div>
    );
  }

  // Render the correct screen based on the state router
  const renderScreen = () => {
    switch (currentScreen) {
      case "welcome":
        return <WelcomeScreen />;
      case "auth":
        return <AuthScreen />;
      case "plan":
        return <PlanScreen />;
      case "onboarding":
        return <OnboardingScreen />;
      case "stripe-sandbox":
        return <StripeSandboxScreen />;
      case "add":
      case "edit":
        return <AddEditScreen />;
      case "details":
        return <DetailsScreen />;
      case "dashboard":
      default:
        // Render corresponding Tab within the Dashboard
        switch (activeTab) {
          case "home":
            return <DashboardScreen />;
          case "subscriptions":
            return <ListScreen />;
          case "calendar":
            return <CalendarScreen />;
          case "metrics":
            return <MetricsScreen />;
          case "settings":
            return <SettingsScreen />;
          default:
            return <DashboardScreen />;
        }
    }
  };

  // Determine if we should render bottom tab navigation
  const showBottomNav = 
    currentScreen === "dashboard" || 
    currentScreen === "details";

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col items-center justify-center p-0 sm:py-8 ${profile?.theme ? `theme-${profile.theme}` : "theme-forest"}`}>
      
      {/* Title above the phone, visible only on desktop */}
      <div className="hidden sm:flex flex-col items-center mb-5 text-center select-none shrink-0">
        <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-white text-slate-800 shadow-md border border-slate-200 mb-2.5">
          <svg className="w-5 h-5 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
        <h1 className="font-display font-black text-slate-900 text-sm tracking-wider uppercase">
          SubTracker Mobile Preview
        </h1>
        <p className="font-sans text-[9px] text-slate-500 font-extrabold tracking-widest uppercase mt-1">
          Simulated High-Fidelity Device Canvas
        </p>
      </div>

      {/* Phone Chassis Container */}
      {/* On mobile: full screen, no bezel */}
      {/* On desktop (sm): w-[390px] h-[844px], rounded, black border, shadow */}
      <div className={`w-full h-screen sm:w-[390px] sm:h-[844px] sm:rounded-[54px] sm:border-[12px] sm:border-slate-950 sm:bg-slate-950 sm:p-0 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] sm:ring-4 sm:ring-slate-900/40 relative flex flex-col overflow-hidden transform translate-y-0 phone-screen-container ${profile?.theme ? `theme-${profile.theme}` : "theme-forest"}`}>
        
        {/* Simulated iOS Status Bar inside the screen */}
        <div className="hidden sm:flex h-11 px-6 pt-3 pb-1.5 items-center justify-between text-slate-900 bg-transparent font-sans text-[11px] font-bold select-none z-40 shrink-0 relative">
          {/* Time */}
          <div className="text-[12px] font-extrabold tracking-tight text-slate-800">
            <StatusBarTime />
          </div>
          
          {/* Camera Notch / Dynamic Island */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-[110px] h-6 bg-slate-950 rounded-full hidden sm:flex items-center justify-center gap-1.5 px-3 border border-slate-900/50 shadow-inner">
            <div className="w-1.5 h-1.5 bg-slate-900 rounded-full ring-1 ring-slate-800/40" />
            <div className="w-1 h-1 bg-indigo-950/40 rounded-full" />
          </div>

          {/* Status Bar Icons */}
          <div className="flex items-center gap-1.5 text-slate-800">
            {/* Cellular Signal Icon */}
            <svg className="w-[17px] h-3.5 fill-current" viewBox="0 0 17 11">
              <rect x="0" y="8" width="2.2" height="3" rx="0.5" />
              <rect x="4" y="6" width="2.2" height="5" rx="0.5" />
              <rect x="8" y="3" width="2.2" height="8" rx="0.5" />
              <rect x="12" y="0" width="2.2" height="11" rx="0.5" />
            </svg>
            
            {/* Wi-Fi Icon */}
            <svg className="w-4 h-3.5 fill-current" viewBox="0 0 16 11">
              <path d="M8 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-3.54-4.54a5 5 0 017.08 0l1.06-1.06a6.5 6.5 0 00-9.2 0l1.06 1.06zm-2.12-2.12a8 8 0 0111.32 0l1.06-1.06a9.5 9.5 0 00-13.44 0l1.06 1.06z" />
            </svg>

            {/* Battery Icon */}
            <svg className="w-[22px] h-3.5 fill-none stroke-current" strokeWidth="1.5" viewBox="0 0 22 11">
              <rect x="1" y="1" width="16" height="9" rx="2" />
              <path d="M18 4.5v2" strokeLinecap="round" strokeWidth="2" />
              <rect x="3" y="3" width="10" height="5" rx="1" className="fill-current stroke-none" />
            </svg>
          </div>
        </div>

        {/* Outer app screen inner rounded boundary wrapper */}
        <div className="flex-1 flex flex-col relative sm:rounded-[42px] overflow-hidden bg-slate-50">
          
          {/* Payment Toast/Banner Alerts */}
          {paymentSuccess && (
            <div className="absolute top-4 left-4 right-4 bg-emerald-50 text-emerald-950 border border-emerald-200 p-4 z-50 rounded-2xl shadow-xl animate-bounce flex gap-2.5 items-start">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
              <div className="flex-1">
                <h4 className="font-display font-extrabold text-xs">Payment Complete!</h4>
                <p className="text-[10px] leading-snug text-emerald-700 mt-0.5">
                  Lifetime Premium features unlocked successfully. Welcome to SubsTracker Hub Premium!
                </p>
              </div>
              <button 
                id="payment-success-close-btn"
                onClick={clearSandboxParams} 
                className="text-emerald-800 hover:text-slate-950 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {paymentCancel && (
            <div className="absolute top-4 left-4 right-4 bg-slate-50 text-slate-900 border border-slate-200 p-4 z-50 rounded-2xl shadow-xl flex gap-2.5 items-start">
              <AlertTriangle className="text-slate-500 shrink-0 mt-0.5" size={16} />
              <div className="flex-1">
                <h4 className="font-display font-bold text-xs">Checkout Canceled</h4>
                <p className="text-[10px] leading-snug text-slate-500 mt-0.5">
                  Stripe Premium checkout session was canceled. Your local free data remains safe.
                </p>
              </div>
              <button 
                id="payment-cancel-close-btn"
                onClick={clearSandboxParams} 
                className="text-slate-600 hover:text-slate-950 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Secure Stripe Checkout Iframe-Breakout Modal */}
          {stripeCheckoutUrl && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 flex flex-col items-center text-center animate-scale-up max-h-[90vh] overflow-y-auto">
                <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50/50 shrink-0">
                  <CreditCard size={28} className="animate-pulse" />
                </div>
                
                <h3 className="font-display font-black text-slate-900 text-lg tracking-tight">Secure Payment Gateway</h3>
                <p className="text-xs text-slate-500 mt-2 font-sans px-2">
                  We've initialized Stripe Checkout for your Premium upgrade.
                </p>
                
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 my-4 text-left w-full flex flex-col gap-2.5 shrink-0">
                  <div className="flex gap-3">
                    <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                    <p className="text-[11px] leading-relaxed text-slate-600 font-sans">
                      Complete your checkout securely in the new browser window.
                    </p>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2.5 flex gap-3">
                    <Info className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] leading-relaxed text-amber-700 font-sans">
                      <span className="font-semibold block mb-0.5 text-amber-800">Sandbox Preview Notice:</span>
                      Since the app runs in a secure sandbox, the redirect tab might show a <strong className="font-bold">403 Forbidden</strong> error. This is normal! Simply close that tab, return here, and click <strong className="font-bold text-amber-800">Verify Payment & Activate</strong> below to instantly unlock Premium!
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 w-full mt-1">
                  {/* Bulletproof External Browser opener */}
                  <button 
                    onClick={() => {
                      const isCapacitor = Capacitor.isNativePlatform();
                      if (isCapacitor) {
                        try {
                          window.open(stripeCheckoutUrl, "_system");
                        } catch (e) {
                          window.open(stripeCheckoutUrl, "_blank");
                        }
                      } else {
                        window.open(stripeCheckoutUrl, "_blank");
                      }
                    }}
                    className="w-full py-3 bg-slate-900 text-white font-sans text-xs font-bold rounded-xl shadow-lg hover:bg-slate-850 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <ExternalLink size={14} />
                    Open Stripe Checkout
                  </button>

                  {/* Manual verification fallback button */}
                  {stripeCheckoutSessionId && (
                    <button
                      disabled={verifying}
                      onClick={async () => {
                        setVerifying(true);
                        setVerificationResult(null);
                        try {
                          // Call the API endpoint to check status
                          const response = await fetch(`/api/stripe/session-status/${stripeCheckoutSessionId}`);
                          if (response.ok) {
                            const data = await response.json();
                            if (data.payment_status === "paid") {
                              // Let AppContext process and apply the grant!
                              await verifyStripeSession(stripeCheckoutSessionId);
                              setStripeCheckoutUrl(null);
                              setVerificationResult(null);
                            } else {
                              setVerificationResult("Verification Response: Stripe reports payment is still pending or unpaid. Please complete payment first.");
                            }
                          } else {
                            const errorData = await response.json().catch(() => ({}));
                            setVerificationResult(`Server check failed: ${errorData.error || "Unrecognized server state"}`);
                          }
                        } catch (e: any) {
                          setVerificationResult(`Network error: ${e.message || "Failed to contact gateway backend."}`);
                        } finally {
                          setVerifying(false);
                        }
                      }}
                      className="w-full py-3 bg-emerald-600 text-white font-sans text-xs font-bold rounded-xl shadow-md hover:bg-emerald-700 disabled:opacity-50 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      {verifying ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      {verifying ? "Checking Stripe Status..." : "Verify Payment & Activate"}
                    </button>
                  )}

                  {verificationResult && (
                    <p className="text-[10px] text-slate-600 font-mono bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-left w-full leading-normal animate-fade-in whitespace-pre-wrap">
                      {verificationResult}
                    </p>
                  )}
                  
                  <button
                    onClick={() => {
                      setStripeCheckoutUrl(null);
                      setVerificationResult(null);
                    }}
                    className="mt-1 text-[11px] font-sans text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
                  >
                    Cancel & Go Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Add overlay — lightweight name+price entry, available from any screen
              via the BottomNav trigger. Isolated component; doesn't touch AddEditScreen. */}
          {showQuickAdd && <QuickAddModal />}

          {/* Dynamic Screen Mounting with scroll isolation inside the phone screen */}
          <main className="flex-1 flex flex-col overflow-y-auto">
            {renderScreen()}
            {showBottomNav ? (
              <div className="h-32 shrink-0 pointer-events-none" />
            ) : (
              <div className="h-8 shrink-0 pointer-events-none" />
            )}
          </main>

          {/* Global Floating Bottom Tab Navigation */}
          {showBottomNav && <BottomNav />}
        </div>

        {/* Physical Home Indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-950/20 rounded-full z-50 pointer-events-none hidden sm:block" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
