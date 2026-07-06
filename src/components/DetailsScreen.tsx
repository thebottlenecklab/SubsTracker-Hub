import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatReadableDate, getDaysRemaining } from "../utils";
import { 
  ChevronLeft, Edit3, Trash2, Pause, Play, Ban, Calendar, Info, 
  Bell, FileText, CheckSquare, Sparkles 
} from "lucide-react";

export default function DetailsScreen() {
  const { 
    subscriptions, 
    selectedSubscriptionId, 
    setSelectedSubId, 
    setScreen, 
    setTab, 
    editSubscription, 
    deleteSubscription 
  } = useApp();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sub = subscriptions.find(s => s.id === selectedSubscriptionId);

  if (!sub) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-5 pb-24 select-none">
        <div className="my-auto text-center max-w-sm mx-auto w-full">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-md">
            <p className="font-display font-bold text-sm text-slate-800 mb-3">Subscription not found</p>
            <button
              id="details-error-back-btn"
              onClick={() => setTab("subscriptions")}
              className="bg-slate-900 text-white py-2 px-4 font-mono text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Back to Subscriptions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    setSelectedSubId(null);
    setTab("subscriptions");
  };

  const handleEdit = () => {
    // Keep selected subscription ID and jump to Edit screen
    setScreen("edit");
  };

  const handleTogglePause = async () => {
    const newStatus = sub.status === "paused" ? "active" : "paused";
    await editSubscription(sub.id, { status: newStatus });
  };

  const handleMarkCanceled = async () => {
    await editSubscription(sub.id, { status: "canceled" });
  };

  const handleDelete = async () => {
    await deleteSubscription(sub.id);
    handleBack();
  };

  const daysRemaining = getDaysRemaining(sub.nextChargeDate);
  const isTrial = sub.isFreeTrial;

  // Derive reminder alert date
  let alertDateStr = "N/A";
  if (sub.reminderTiming !== "none") {
    const chargeDate = new Date(sub.nextChargeDate);
    let subtractDays = 0;
    if (sub.reminderTiming === "1_day_before") subtractDays = 1;
    else if (sub.reminderTiming === "3_days_before") subtractDays = 3;
    else if (sub.reminderTiming === "7_days_before") subtractDays = 7;
    
    chargeDate.setDate(chargeDate.getDate() - subtractDays);
    alertDateStr = chargeDate.toISOString().split("T")[0];
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-5 pb-24 select-none animate-fade-in">
      
      {/* Navigation Top bar */}
      <div className="flex items-center justify-between pt-4 pb-3 border-b border-slate-200 mb-4">
        <button
          id="details-back-btn"
          onClick={handleBack}
          className="flex items-center gap-1 text-xs font-mono font-bold text-slate-600 hover:text-slate-950 cursor-pointer"
        >
          <ChevronLeft size={14} />
          Back List
        </button>
        <span className="font-display font-extrabold text-sm text-slate-950 uppercase">
          Ledger Invoice
        </span>
        <button
          id="details-edit-btn"
          onClick={handleEdit}
          className="flex items-center gap-1 bg-white border border-slate-200 py-1.5 px-3.5 rounded-lg font-mono text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
        >
          <Edit3 size={11} />
          Edit
        </button>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full flex flex-col gap-4">
        {/* Core Invoice Receipt Box */}
        <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-md relative overflow-hidden">
          
          {/* Top Receipt jagged simulation accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900"></div>

          {/* Service Header Info */}
          <div className="text-center pb-4 border-b border-dashed border-slate-200 mt-2">
            <span className="font-mono text-[8.5px] text-slate-400 uppercase font-bold tracking-widest">{sub.category} Account</span>
            <h2 className="font-display font-extrabold text-xl text-slate-950 mt-1">{sub.name}</h2>
            
            <div className="font-mono text-2xl font-extrabold text-slate-950 mt-2.5">
              {formatCurrency(sub.amount)}
              <span className="text-xs font-bold text-slate-400 uppercase tracking-tight"> / {sub.billingCycle}</span>
            </div>
            
            <div className="mt-3 flex justify-center gap-1.5">
              {/* Status Indicator Pill */}
              <span className={`font-mono text-[9px] font-bold py-0.5 px-3 rounded-full border uppercase tracking-wider ${
                sub.status === "active" 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : sub.status === "paused"
                  ? "bg-slate-100 text-slate-600 border-slate-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}>
                {sub.status}
              </span>

              {isTrial && (
                <span className="font-mono text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-bold py-0.5 px-3 rounded-full uppercase tracking-wider">
                  FREE TRIAL
                </span>
              )}
            </div>
          </div>

          {/* Details Metadata List */}
          <div className="flex flex-col gap-3 py-4 text-xs font-mono border-b border-dashed border-slate-200">
            
            {/* Next Charge Due Date */}
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400 uppercase text-[10px]">Next Charge Due</span>
              <span className="font-bold text-slate-950">{formatReadableDate(sub.nextChargeDate)}</span>
            </div>

            {/* Time remaining */}
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400 uppercase text-[10px]">Days Remaining</span>
              <span className={`font-bold uppercase ${daysRemaining <= 3 && sub.status === "active" ? "text-rose-600" : "text-slate-950"}`}>
                {sub.status !== "active" 
                  ? "Paused" 
                  : daysRemaining === 0 
                  ? "Due Today" 
                  : daysRemaining === 1 
                  ? "Due Tomorrow" 
                  : `${daysRemaining} days`}
              </span>
            </div>

            {/* Trial expiration if applicable */}
            {isTrial && sub.freeTrialEndDate && (
              <div className="flex justify-between items-baseline text-amber-800">
                <span className="text-amber-600 uppercase text-[10px] font-bold">Trial Ends Date</span>
                <span className="font-bold">{formatReadableDate(sub.freeTrialEndDate)} ({getDaysRemaining(sub.freeTrialEndDate)} days left)</span>
              </div>
            )}

            {/* Alerts timetable */}
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400 uppercase text-[10px]">Renewal Alert</span>
              <span className="font-bold text-slate-950">
                {sub.reminderTiming === "none" ? "No reminder set" : `${sub.reminderTiming.replace(/_/g, " ")}`}
              </span>
            </div>
          </div>

          {/* Reminder Alert Timelines History */}
          <div className="py-4 border-b border-dashed border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-700 mb-2">
              <Bell size={13} className="text-slate-950" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">Alert Notification History</span>
            </div>
            
            <div className="flex flex-col gap-1.5 text-[10px] font-mono leading-relaxed text-slate-600">
              {sub.reminderTiming === "none" ? (
                <p className="text-slate-400 italic">No alerts scheduled for this account.</p>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-1 w-1 rounded-full bg-slate-400"></span>
                    <span>Alert armed: {formatReadableDate(alertDateStr)}</span>
                  </div>
                  {daysRemaining > 0 && sub.status === "active" ? (
                    <p className="text-slate-500 italic pl-2.5">
                      ★ Tracker will notify you {sub.reminderTiming.replace(/_before/g, " before").replace(/_/g, " ")}.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Custom Notes Section */}
          <div className="pt-4">
            <div className="flex items-center gap-1.5 text-slate-700 mb-2">
              <FileText size={13} className="text-slate-950" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">Account Reference Notes</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans bg-slate-50 p-3.5 border border-slate-150 rounded-xl">
              {sub.notes ? sub.notes : "No custom notes entered. Tap Edit above to attach subscription credentials, split bills, or tags."}
            </p>
          </div>
        </div>

        {/* Action Controls buttons drawer */}
        <div className="flex flex-col gap-2.5 mt-2">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Pause / Resume Button */}
            <button
              id="details-pause-btn"
              onClick={handleTogglePause}
              className="flex-1 bg-white text-slate-850 py-3 px-3 font-display font-bold text-xs border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              {sub.status === "paused" ? (
                <>
                  <Play size={13} />
                  Resume Billing
                </>
              ) : (
                <>
                  <Pause size={13} />
                  Pause Billing
                </>
              )}
            </button>

            {/* Cancel Button */}
            <button
              id="details-cancel-btn"
              onClick={handleMarkCanceled}
              disabled={sub.status === "canceled"}
              className="flex-1 bg-white text-rose-600 py-3 px-3 font-display font-bold text-xs border border-rose-200 hover:bg-rose-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Ban size={13} />
              Mark Canceled
            </button>
          </div>

          {/* Delete Button / Custom Confirmation */}
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-2.5 p-3.5 bg-rose-50 border border-rose-150 rounded-xl animate-fade-in text-center">
              <p className="text-[11px] font-semibold text-rose-800 leading-normal">
                Are you sure you want to permanently delete {sub.name}? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  id="details-delete-cancel-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 py-2 px-3 font-display font-bold text-[10px] rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="details-delete-confirm-btn"
                  onClick={handleDelete}
                  className="flex-1 bg-rose-600 text-white py-2 px-3 font-display font-bold text-[10px] rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              id="details-delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-rose-50 border border-rose-150 text-rose-700 py-3.5 px-4 font-display font-bold text-xs rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              Permanently Delete Ledger
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
