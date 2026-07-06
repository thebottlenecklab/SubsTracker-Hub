import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { ChevronLeft, Lock, Mail, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, enableLocalOnlyMode, setScreen } = useApp();
  
  const [isSignUp, setIsSignUp] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Check for saved redirect auth errors on mount
  useEffect(() => {
    const redirectErr = localStorage.getItem("substracker_auth_redirect_error");
    if (redirectErr) {
      localStorage.removeItem("substracker_auth_redirect_error");
      
      if (redirectErr === "auth/unauthorized-domain" || redirectErr.includes("unauthorized-domain")) {
        const currentHost = window.location.hostname;
        setError(
          <div className="flex flex-col gap-2 font-sans text-xs text-left">
            <span className="font-bold text-rose-800">Google Sign-In Connection Warning</span>
            <p className="text-slate-600 leading-normal">
              Google Sign-In is unavailable because this domain is not whitelisted in your Firebase project.
            </p>
            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1 text-[11px] text-slate-700 font-mono">
              <span className="font-bold text-slate-900">How to Fix in Firebase Console:</span>
              <span>1. Go to Authentication &gt; Settings</span>
              <span>2. Click "Authorized Domains"</span>
              <span>3. Add: <strong className="text-rose-700 break-all select-all">{currentHost}</strong></span>
              <span>4. Add: <strong className="text-rose-700 select-all">localhost</strong> (if testing locally or on APK/Emulator)</span>
            </div>
            <p className="text-slate-500 text-[10px] italic mt-0.5">
              Pro tip: You can tap "Skip and run local-only" below to test SubsTracker Hub offline immediately!
            </p>
          </div>
        );
      } else if (redirectErr === "auth/operation-not-allowed" || redirectErr.includes("operation-not-allowed")) {
        setError(
          <div className="flex flex-col gap-2 font-sans text-xs text-left">
            <span className="font-bold text-rose-800">Google Sign-In Disabled</span>
            <p className="text-slate-600 leading-normal text-[11px]">
              Google Sign-In has not been enabled for your Firebase project yet.
            </p>
            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1 text-[11px] text-slate-700 font-mono">
              <span className="font-bold text-slate-900">How to Enable Google Provider:</span>
              <span>1. Go to Authentication &gt; Sign-in method</span>
              <span>2. Click "Add new provider" &gt; select "Google"</span>
              <span>3. Toggle the switch to "Enable" and click Save</span>
            </div>
            <p className="text-slate-500 text-[10px] italic mt-0.5">
              Pro tip: You can tap "Skip and run local-only" below to test SubsTracker Hub offline immediately!
            </p>
          </div>
        );
      } else {
        setError(`Failed to authenticate with Google: ${redirectErr}`);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validations
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already in use. Try signing in instead.");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError(
          <div className="flex flex-col gap-2 font-sans text-xs text-left">
            <span className="font-bold text-rose-800">Email & Password Auth Disabled</span>
            <p className="text-slate-600 leading-normal text-[11px]">
              Email & Password registration is disabled. You need to enable it in your Firebase project console.
            </p>
            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1 text-[11px] text-slate-700 font-mono">
              <span className="font-bold text-slate-900">How to Enable in Firebase Console:</span>
              <span>1. Go to Authentication &gt; Sign-in method</span>
              <span>2. Click "Add new provider" &gt; select "Email/Password"</span>
              <span>3. Turn on "Email/Password" (leave Passwordless off) and Save</span>
            </div>
            <p className="text-slate-500 text-[10px] italic mt-0.5">
              Pro tip: You can tap "Skip and run local-only" below to test SubsTracker Hub offline immediately!
            </p>
          </div>
        );
      } else {
        setError(
          <div className="flex flex-col gap-1 text-left font-sans text-xs">
            <span className="font-bold text-rose-800">Authentication Error</span>
            <p className="text-slate-600 leading-normal">{err.message || "An unknown error occurred during authentication."}</p>
            {err.code && (
              <span className="font-mono text-[10.5px] bg-rose-50 text-rose-800 p-1 px-1.5 rounded border border-rose-100 mt-1 select-all">
                Code: {err.code}
              </span>
            )}
          </div>
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (
        err.code === "auth/popup-blocked" || 
        err.code === "auth/cancelled-popup-request" ||
        (err.message && (err.message.includes("popup-blocked") || err.message.includes("cancelled-popup-request")))
      ) {
        setError(
          <div className="flex flex-col gap-2 font-sans text-xs text-left">
            <span className="font-bold text-amber-800">Google Sign-In Popup Blocked</span>
            <p className="text-slate-600 leading-normal">
              Your mobile or desktop browser blocked the sign-in popup window. 
            </p>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex flex-col gap-1 text-[11px] text-slate-700 font-mono">
              <span className="font-bold text-slate-900">How to authorize Google Sign-In:</span>
              <span>1. Look for the blocked popup icon/setting in your browser's address bar or menu.</span>
              <span>2. Select <strong>Always Allow Pop-ups</strong> for this site.</span>
              <span>3. Click <strong>Continue with Google</strong> again to sign in!</span>
            </div>
            <p className="text-slate-500 text-[10px] italic mt-0.5">
              Note: Popups are fully supported on mobile Safari & Chrome but require one-click user consent.
            </p>
          </div>
        );
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("Google Sign-In popup was closed before completion. Please try again.");
      } else if (err.code === "auth/unauthorized-domain" || (err.message && err.message.includes("unauthorized-domain"))) {
        const currentHost = window.location.hostname;
        setError(
          <div className="flex flex-col gap-2 font-sans text-xs text-left">
            <span className="font-bold text-rose-800">Google Sign-In Connection Warning</span>
            <p className="text-slate-600 leading-normal">
              Google Sign-In is unavailable because this domain is not whitelisted in your Firebase project.
            </p>
            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1 text-[11px] text-slate-700 font-mono">
              <span className="font-bold text-slate-900">How to Fix in Firebase Console:</span>
              <span>1. Go to Authentication &gt; Settings</span>
              <span>2. Click "Authorized Domains"</span>
              <span>3. Add: <strong className="text-rose-700 break-all select-all">{currentHost}</strong></span>
              <span>4. Add: <strong className="text-rose-700 select-all">localhost</strong> (if testing locally or on APK/Emulator)</span>
            </div>
            <p className="text-slate-500 text-[10px] italic mt-0.5">
              Pro tip: You can tap "Skip and run local-only" below to test SubsTracker Hub offline immediately!
            </p>
          </div>
        );
      } else if (err.code === "auth/operation-not-allowed" || (err.message && err.message.includes("operation-not-allowed"))) {
        setError(
          <div className="flex flex-col gap-2 font-sans text-xs text-left">
            <span className="font-bold text-rose-800">Google Sign-In Disabled</span>
            <p className="text-slate-600 leading-normal text-[11px]">
              Google Sign-In has not been enabled for your Firebase project yet.
            </p>
            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1 text-[11px] text-slate-700 font-mono">
              <span className="font-bold text-slate-900">How to Enable Google Provider:</span>
              <span>1. Go to Authentication &gt; Sign-in method</span>
              <span>2. Click "Add new provider" &gt; select "Google"</span>
              <span>3. Toggle the switch to "Enable" and click Save</span>
            </div>
            <p className="text-slate-500 text-[10px] italic mt-0.5">
              Pro tip: You can tap "Skip and run local-only" below to test SubsTracker Hub offline immediately!
            </p>
          </div>
        );
      } else {
        setError(
          <div className="flex flex-col gap-1 text-left font-sans text-xs">
            <span className="font-bold text-rose-800">Google Sign-In Error</span>
            <p className="text-slate-600 leading-normal">{err.message || "Failed to authenticate with Google."}</p>
            {err.code && (
              <span className="font-mono text-[10.5px] bg-rose-50 text-rose-800 p-1 px-1.5 rounded border border-rose-100 mt-1 select-all">
                Code: {err.code}
              </span>
            )}
          </div>
        );
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-6 justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          id="auth-back-btn"
          onClick={() => setScreen("welcome")}
          className="flex items-center gap-1 text-xs font-mono font-bold text-slate-600 hover:text-slate-950 hover:underline cursor-pointer"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <span className="font-mono text-[10px] text-slate-400">Step 2 of 4</span>
      </div>

      {/* Main Container */}
      <div className="my-auto py-6 max-w-sm mx-auto w-full">
        <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-md flex flex-col gap-5">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 uppercase">
              {isSignUp ? "Create Your Account" : "Welcome Back"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-normal font-sans">
              {isSignUp 
                ? "Securely backup, restore, and synchronize your manual subscription ledgers across all your devices."
                : "Sign in to retrieve your stored manual subscription ledgers and profiles."}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3.5 border border-rose-200 text-xs font-mono flex items-start gap-2 rounded-xl">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Continue with Google button */}
          <button
            id="auth-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-slate-800 py-2.5 px-4 font-mono font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.245-3.125C18.29 1.95 15.42 1 12.24 1 6.07 1 1 6.07 1 12.24s5.07 11.24 11.24 11.24c6.44 0 10.74-4.52 10.74-10.915 0-.735-.078-1.29-.177-1.58H12.24z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-2">
            <hr className="flex-1 border-slate-200" />
            <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">or use email</span>
            <hr className="flex-1 border-slate-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase text-slate-500 tracking-wider">Email Address</label>
              <div className="relative">
                <input
                  id="auth-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 pl-9 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans shadow-xs"
                  required
                />
                <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase text-slate-500 tracking-wider">Password</label>
              <div className="relative">
                <input
                  id="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 pl-9 pr-9 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans shadow-xs"
                  required
                />
                <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                <button
                  id="auth-toggle-pass-btn"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <label className="font-mono text-[10px] font-bold uppercase text-slate-500 tracking-wider">Confirm Password</label>
                <div className="relative">
                  <input
                    id="auth-confirm-password-input"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 pl-9 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans shadow-xs"
                    required={isSignUp}
                  />
                  <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 px-4 font-display font-bold text-sm rounded-xl shadow-md hover:bg-slate-800 hover:shadow-lg transition-all disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? "Authenticating..." : isSignUp ? "Create Account & Continue" : "Sign In"}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center pt-3 border-t border-dashed border-slate-150">
            <button
              id="auth-toggle-mode-btn"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="font-mono text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:underline cursor-pointer"
            >
              {isSignUp 
                ? "Already have an account? Sign In" 
                : "Need an account? Create one here"}
            </button>
          </div>
        </div>
      </div>

      {/* Local-only disclaimer */}
      <div className="flex flex-col gap-2 items-center text-center">
        <button
          id="auth-local-skip-btn"
          onClick={enableLocalOnlyMode}
          className="font-mono text-xs text-slate-600 hover:text-slate-950 font-bold underline cursor-pointer"
        >
          Skip and run local-only (No account required)
        </button>
        <span className="text-[10px] text-slate-400 leading-tight font-mono max-w-xs">
          Note: Local-only data is stored on this browser. It will be cleared if you wipe your browsing cache.
        </span>
      </div>
    </div>
  );
}
