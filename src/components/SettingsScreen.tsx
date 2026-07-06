import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { downloadCSV, getAutoDetectedCurrency } from "../utils";
import { 
  LogOut, Shield, Download, Upload, RefreshCw, Key, CreditCard, 
  Trash2, ShieldCheck, Check, AlertCircle, FileText, HelpCircle, UserCheck,
  Globe, Palette
} from "lucide-react";

export default function SettingsScreen() {
  const { 
    profile, 
    user, 
    isLocalOnly, 
    subscriptions, 
    triggerLogout, 
    restorePurchases, 
    exportLocalData, 
    importLocalData, 
    unlockPremium, 
    setScreen,
    setProfileField
  } = useApp();

  const [importJson, setImportJson] = useState<string>("");
  const [showImportArea, setShowImportArea] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [csvCopied, setCsvCopied] = useState<boolean>(false);

  const handleCopyBackup = () => {
    const jsonStr = exportLocalData();
    navigator.clipboard.writeText(jsonStr);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleCsvDownload = () => {
    const csvStr = downloadCSV(subscriptions);
    setCsvContent(csvStr);
    
    // Copy to clipboard for easy pasting as a fallback
    try {
      navigator.clipboard.writeText(csvStr);
      setCsvCopied(true);
      setTimeout(() => setCsvCopied(false), 3000);
    } catch (err) {
      console.warn("Failed to copy CSV to clipboard automatically:", err);
    }

    // Programmatically create and submit a form to trigger native device download via Express backend.
    // Since the server returns the CSV file with "Content-Disposition: attachment", the browser
    // will trigger a native download prompt directly on the user's mobile or desktop device
    // without redirecting or reloading the page.
    try {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/export-csv";
      
      const csvInput = document.createElement("input");
      csvInput.type = "hidden";
      csvInput.name = "csvData";
      csvInput.value = csvStr;
      form.appendChild(csvInput);

      const filenameInput = document.createElement("input");
      filenameInput.type = "hidden";
      filenameInput.name = "filename";
      filenameInput.value = `SubsTracker_Hub_Backup_${new Date().toISOString().split('T')[0]}.csv`;
      form.appendChild(filenameInput);

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } catch (err) {
      console.error("Failed to programmatically submit CSV download form:", err);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus(null);
    if (!importJson.trim()) return;

    const success = importLocalData(importJson.trim());
    if (success) {
      setImportStatus({ type: "success", message: "Ledger database imported and synchronized successfully!" });
      setImportJson("");
      setTimeout(() => setImportStatus(null), 4000);
    } else {
      setImportStatus({ type: "error", message: "Invalid JSON backup data. Please double-check formatting." });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-5 pb-36 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-3 border-b border-slate-200 mb-4">
        <div>
          <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">Preferences</span>
          <h1 className="font-display font-extrabold text-xl text-slate-950 uppercase">Settings & Account</h1>
        </div>
        <span className="font-mono text-[10px] bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
          CONFIG
        </span>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full flex flex-col gap-4">
        
        {/* Plan Status Box */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-md flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Plan Tier</span>
            <span className={`font-mono text-[9px] font-bold py-0.5 px-3.5 border rounded-full uppercase tracking-wider ${
              profile?.isPremium ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              {profile?.isPremium ? "★ PREMIUM MEMBER" : "FREE PLAN"}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="font-display font-bold text-sm text-slate-950">
              {profile?.isPremium ? "Unlimited Premium Lifetime" : "SubsTracker Hub Free Tier"}
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              {profile?.isPremium 
                ? "Thank you for supporting SubsTracker Hub! You have unlocked unlimited subscription accounts, multiple-device synchronization, and encrypted cloud backups."
                : `Currently tracking ${subscriptions.length}/5 subscription accounts. Upgrade to Premium for unlimited tracking and sync.`}
            </p>
          </div>

          {!profile?.isPremium ? (
            <button
              id="settings-unlock-premium-btn"
              onClick={unlockPremium}
              className="w-full bg-slate-900 text-white py-2.5 px-4 font-display font-bold text-xs rounded-xl shadow-sm hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CreditCard size={12} />
              Unlock Premium Lifetime ($19.99)
            </button>
          ) : null}

          <button
            id="settings-restore-btn"
            onClick={restorePurchases}
            className="text-left font-mono text-[10px] font-bold text-slate-600 hover:text-slate-950 hover:underline cursor-pointer flex items-center gap-1"
          >
            <RefreshCw size={10} />
            Restore Purchase Status
          </button>
        </div>

        {/* Appearance & Themes Box */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-md flex flex-col gap-3">
          <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <Palette size={11} className="text-slate-500" />
            Appearance & Themes
          </span>
          <p className="text-[10px] text-slate-400 font-mono leading-normal">
            Choose your signature workspace vibe. Premium, high-contrast palettes completely free of pure blacks or grey-slates.
          </p>

          <div className="grid grid-cols-1 gap-2 mt-1">
            {[
              { id: "forest", name: "Forest Spruce", desc: "Sage & Deep Pine Forest", bg: "bg-[#F5F8F6]", border: "border-[#D0DBD4]", primary: "#3E5F4A" },
              { id: "burgundy", name: "Royal Burgundy", desc: "Wine Velvet & Rose Cream", bg: "bg-[#FCFAF9]", border: "border-[#DECCCC]", primary: "#8E3E3E" },
              { id: "navy", name: "Nordic Navy", desc: "Scandinavian Ocean Fjord", bg: "bg-[#F4F7FC]", border: "border-[#C9D6E8]", primary: "#3B5B8C" },
              { id: "terracotta", name: "Warm Terracotta", desc: "Desert Clay & Sienna Sand", bg: "bg-[#FDFBFA]", border: "border-[#DFCEC2]", primary: "#B36B4D" },
              { id: "amethyst", name: "Majestic Amethyst", desc: "Imperial Violet & Lavender", bg: "bg-[#FAF7FC]", border: "border-[#D7CDDF]", primary: "#7B4A8E" },
            ].map((themeOpt) => {
              const isActive = (profile?.theme || "forest") === themeOpt.id;
              return (
                <button
                  key={themeOpt.id}
                  id={`theme-select-${themeOpt.id}`}
                  onClick={() => setProfileField("theme", themeOpt.id)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? "border-slate-800 bg-slate-100/50 shadow-xs ring-1 ring-slate-800" 
                      : "border-slate-150 bg-slate-50/20 hover:bg-slate-50/60 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Theme color swatch preview pill */}
                    <div className={`w-8 h-8 rounded-lg ${themeOpt.bg} ${themeOpt.border} border flex items-center justify-center shadow-xs shrink-0`}>
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: themeOpt.primary }} />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        {themeOpt.name}
                        {isActive && (
                          <span className="font-mono text-[8px] bg-slate-800 text-white px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                            Active
                          </span>
                        )}
                      </h5>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{themeOpt.desc}</p>
                    </div>
                  </div>
                  {isActive ? (
                    <div className="bg-slate-800 text-white rounded-full p-1 shadow-sm">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-200" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Regional Preferences Settings Box */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-md flex flex-col gap-3">
          <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <Globe size={11} className="text-slate-500" />
            Regional Preferences
          </span>
          
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] font-bold uppercase text-slate-500 tracking-wider">Default Currency</label>
            <div className="relative">
              <select
                id="settings-currency-select"
                value={profile?.currency || ""}
                onChange={(e) => setProfileField("currency", e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 pr-8 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-300 shadow-xs appearance-none cursor-pointer"
              >
                <option value="">Auto-Detect ({getAutoDetectedCurrency()})</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="JPY">JPY (¥) — Japanese Yen</option>
                <option value="CAD">CAD (CA$) — Canadian Dollar</option>
                <option value="AUD">AUD (A$) — Australian Dollar</option>
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="BRL">BRL (R$) — Brazilian Real</option>
                <option value="ZAR">ZAR (R) — South African Rand</option>
                <option value="SGD">SGD (S$) — Singapore Dollar</option>
                <option value="CNY">CNY (CN¥) — Chinese Yuan</option>
                <option value="CHF">CHF (CHF) — Swiss Franc</option>
                <option value="MXN">MXN (MX$) — Mexican Peso</option>
                <option value="NZD">NZD (NZ$) — New Zealand Dollar</option>
                <option value="SEK">SEK (kr) — Swedish Krona</option>
                <option value="NOK">NOK (kr) — Norwegian Krone</option>
                <option value="DKK">DKK (kr) — Danish Krone</option>
                <option value="AED">AED (AED) — UAE Dirham</option>
                <option value="SAR">SAR (SR) — Saudi Riyal</option>
                <option value="TRY">TRY (₺) — Turkish Lira</option>
                <option value="KRW">KRW (₩) — South Korean Won</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-mono italic leading-normal">
              Prices, totals, and metrics will automatically render in your chosen currency format.
            </p>
          </div>
        </div>

        {/* Account Settings Box */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-md flex flex-col gap-3">
          <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 pb-1.5">Account & Sync</span>
          
          <div className="flex flex-col gap-2 text-xs font-sans text-slate-700">
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-slate-400">Connection:</span>
              <span className="font-bold text-slate-900 font-mono text-[11px]">
                {isLocalOnly ? "Local Offline-Only" : "Cloud Synchronized"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-slate-400">Sign-in Email:</span>
              <span className="font-bold text-slate-900 font-mono text-[11px] truncate max-w-[180px]">
                {user?.email ? user.email : "No email logged in"}
              </span>
            </div>
          </div>

          <button
            id="settings-logout-btn"
            onClick={triggerLogout}
            className="w-full bg-white text-slate-800 py-2.5 px-4 font-mono font-bold text-xs border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut size={12} />
            {isLocalOnly ? "Reset Local Mode" : "Log Out of Account"}
          </button>
        </div>

        {/* Backup and Data Export Box */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-md flex flex-col gap-3.5">
          <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 pb-1.5">Data Portability</span>
          
          <div className="grid grid-cols-2 gap-2.5">
            {/* JSON Export */}
            <button
              id="settings-export-json-btn"
              onClick={handleCopyBackup}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-2 px-1.5 font-mono text-[10px] font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              <Download size={11} />
              {exportSuccess ? "Copied JSON!" : "Export JSON"}
            </button>

            {/* CSV Export */}
            <button
              id="settings-export-csv-btn"
              onClick={handleCsvDownload}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-2 px-1.5 font-mono text-[10px] font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              <FileText size={11} />
              {csvCopied ? "CSV Copied!" : "Export CSV Ledger"}
            </button>
          </div>

          {csvContent && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-1 flex flex-col gap-2 animate-fade-in text-[11px] relative">
              <button 
                type="button"
                onClick={() => setCsvContent(null)}
                className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-700 font-bold font-mono text-xs cursor-pointer"
                title="Hide CSV"
              >
                ✕
              </button>
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-0.5">
                <Check className="text-emerald-600 animate-pulse" size={13} />
                <span>CSV Ledger Ready & Copied!</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                Due to phone/sandbox constraints, standard downloads may be blocked. The CSV table data is copied to your clipboard to paste into Google Sheets or Excel. You can also manually copy below:
              </p>
              <textarea
                readOnly
                value={csvContent}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full h-24 bg-white border border-slate-200 rounded-lg p-2 font-mono text-[9px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none cursor-text shadow-xs"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(csvContent);
                    setCsvCopied(true);
                    setTimeout(() => setCsvCopied(false), 3000);
                  } catch (e) {
                    console.error("Failed to copy", e);
                  }
                }}
                className="self-end px-3 py-1 bg-slate-900 text-white font-mono text-[9px] rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                {csvCopied ? "Copied to Clipboard!" : "Copy Raw CSV"}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              id="settings-toggle-import-btn"
              onClick={() => setShowImportArea(!showImportArea)}
              className="text-center font-mono text-[10px] font-bold text-slate-600 hover:text-slate-950 underline cursor-pointer"
            >
              {showImportArea ? "Hide Import Console" : "Import Backup JSON →"}
            </button>

            {showImportArea && (
              <form onSubmit={handleImportSubmit} className="flex flex-col gap-2.5 animate-fade-in mt-1.5">
                <textarea
                  id="settings-import-textarea"
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder="Paste your exported JSON database here..."
                  rows={4}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none shadow-xs"
                  required
                />
                
                {importStatus && (
                  <div className={`p-3 border text-[9px] font-mono flex items-start gap-1 rounded-xl ${
                    importStatus.type === "success" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {importStatus.type === "success" ? <Check size={12} /> : <AlertCircle size={12} />}
                    <span>{importStatus.message}</span>
                  </div>
                )}

                <button
                  id="settings-import-submit-btn"
                  type="submit"
                  className="w-full bg-slate-900 text-white py-2.5 px-4 font-mono font-bold text-[10px] rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Confirm Import & Overwrite
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Security & Privacy Settings informational block */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-md flex flex-col gap-2.5">
          <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 pb-1.5">Privacy Guarantee</span>
          
          <div className="flex gap-2.5 items-start text-[11px] text-slate-500 font-sans leading-relaxed">
            <ShieldCheck size={14} className="text-slate-900 shrink-0 mt-0.5" />
            <span>
              <strong>SubsTracker Hub</strong> operates with end-to-end privacy. No cookies tracking your browser, no third-party analytic tags selling your trends, and absolutely zero linking to checking accounts or credit lines. Your ledger security depends on your custom email credentials or offline encryption.
            </span>
          </div>
        </div>

        {/* Bottom spacer to prevent the floating bottom nav from overlapping the card */}
        <div className="h-36 w-full shrink-0" />

      </div>
    </div>
  );
}
