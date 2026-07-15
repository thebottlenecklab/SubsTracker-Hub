import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatReadableDate, getYearlySpendData } from "../utils";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar as CalendarIcon,
  Star,
  Tv,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight
} from "lucide-react";

export default function CalendarScreen() {
  const { subscriptions, setSelectedSubId, setScreen, setTab } = useApp();
  
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const spendData = useMemo(() => {
    return getYearlySpendData(subscriptions, year);
  }, [subscriptions, year]);

  // Previous month's breakdown, fetched from the prior year's data if the current month is January
  const prevMonthData = useMemo(() => {
    const prevDate = new Date(year, month - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthIdx = prevDate.getMonth();
    const prevYearSpendData = prevYear === year ? spendData : getYearlySpendData(subscriptions, prevYear);
    return prevYearSpendData[prevMonthIdx];
  }, [subscriptions, year, month, spendData]);

  const currentMonthData = spendData[month];
  const spendDelta = currentMonthData.totalSpend - prevMonthData.totalSpend;
  const spendDeltaPct = prevMonthData.totalSpend > 0
    ? (spendDelta / prevMonthData.totalSpend) * 100
    : (currentMonthData.totalSpend > 0 ? 100 : 0);

  // Month information
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Days in current month
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  // Day of week of first day of month (0-6)
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const totalDays = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Convert date indices to date string: YYYY-MM-DD
  const makeDateString = (dayNum: number): string => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  // Check if a subscription bills on this day
  const getSubsOnDay = (dayStr: string) => {
    return subscriptions.filter(sub => sub.nextChargeDate === dayStr && sub.status === "active");
  };

  // Check if a subscription trial expires on this day
  const getTrialsOnDay = (dayStr: string) => {
    return subscriptions.filter(sub => sub.isFreeTrial && sub.freeTrialEndDate === dayStr && sub.status === "active");
  };

  const selectedDateSubs = getSubsOnDay(selectedDayStr);
  const selectedDateTrials = getTrialsOnDay(selectedDayStr);

  const handleOpenDetails = (id: string) => {
    setSelectedSubId(id);
    setScreen("details");
  };

  // Build Calendar Cell Grid List
  const cells = [];
  // Empty slots for previous month offset
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(<div key={`empty-${i}`} className="h-10 border border-slate-100/50 bg-slate-50/50 opacity-40 rounded-lg"></div>);
  }

  // Populate actual calendar days
  for (let d = 1; d <= totalDays; d++) {
    const dayStr = makeDateString(d);
    const daySubs = getSubsOnDay(dayStr);
    const dayTrials = getTrialsOnDay(dayStr);
    
    const isSelected = dayStr === selectedDayStr;
    const hasCharge = daySubs.length > 0;
    const hasTrialEnd = dayTrials.length > 0;

    cells.push(
      <button
        id={`cal-day-${d}`}
        key={`day-${d}`}
        onClick={() => setSelectedDayStr(dayStr)}
        className={`h-10 relative flex flex-col justify-between p-1.5 border border-slate-100 text-xs font-mono font-bold transition-all rounded-lg cursor-pointer ${
          isSelected 
            ? "bg-slate-900 text-white border-slate-900 z-10 shadow-sm" 
            : "bg-white text-slate-900 hover:bg-slate-50"
        }`}
      >
        <span>{d}</span>

        {/* Indicators Row */}
        <div className="flex gap-1 justify-center w-full pb-0.5">
          {hasCharge && (
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-slate-900"}`} />
          )}
          {hasTrialEnd && (
            <span className={`h-1.5 w-1.5 rotate-45 shrink-0 ${isSelected ? "bg-amber-300" : "bg-amber-500"}`} />
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-5 pb-36 select-none animate-fade-in">
      
      {/* Top Header bar */}
      <div className="flex items-center justify-between pt-4 pb-3 border-b border-slate-200 mb-4">
        <div>
          <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-widest">Billing Cycles</span>
          <h1 className="font-display font-extrabold text-xl text-slate-950 uppercase tracking-tight">Calendar</h1>
        </div>
        <span className="font-mono text-[10px] bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg text-slate-700 shadow-xs">
          {monthNames[month]} {year}
        </span>
      </div>

      {/* Month Picker Controls */}
      <div className="max-w-sm mx-auto w-full flex justify-between items-center bg-white border border-slate-150 p-2 rounded-xl shadow-xs mb-4">
        <button
          id="cal-prev-month-btn"
          onClick={prevMonth}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <ChevronLeft size={16} className="text-slate-600" />
        </button>
        <span className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">
          {monthNames[month]} {year}
        </span>
        <button
          id="cal-next-month-btn"
          onClick={nextMonth}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <ChevronRight size={16} className="text-slate-600" />
        </button>
      </div>

      {/* Calendar Grid card */}
      <div className="max-w-sm mx-auto w-full bg-white border border-slate-150 p-4 rounded-2xl shadow-sm mb-4">
        {/* Days of week */}
        <div className="grid grid-cols-7 text-center font-mono text-[10px] font-bold uppercase text-slate-400 mb-2 border-b border-slate-100 pb-2">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells}
        </div>

        {/* Legend block */}
        <div className="border-t border-dashed border-slate-100 mt-4 pt-3 flex justify-around text-[9px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
            <span>● Subscription Bill</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rotate-45 bg-amber-500" />
            <span>▲ Trial Ending</span>
          </div>
        </div>
      </div>

      {/* Month-over-Month Spend Insight Card */}
      <div className="max-w-sm mx-auto w-full bg-white border border-slate-150 p-4 rounded-2xl shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={15} className="text-slate-900" />
            <h3 className="font-display font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              {monthNames[month]} Spend Insight
            </h3>
          </div>
          <button
            id="cal-goto-metrics-btn"
            onClick={() => setTab("metrics")}
            className="font-mono text-[9px] text-slate-500 hover:text-slate-950 font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            Insights <ArrowUpRight size={10} />
          </button>
        </div>

        {/* This Month vs Last Month comparison */}
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[8px] text-slate-400 uppercase font-bold tracking-wider">This Month</span>
            <span className="font-mono text-lg font-extrabold text-slate-950">
              {formatCurrency(currentMonthData.totalSpend)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 items-end text-right">
            <span className="font-mono text-[8px] text-slate-400 uppercase font-bold tracking-wider">vs Last Month</span>
            <span className={`font-mono text-sm font-bold flex items-center gap-1 ${
              spendDelta > 0 ? "text-rose-600" : spendDelta < 0 ? "text-emerald-600" : "text-slate-500"
            }`}>
              {spendDelta > 0 ? (
                <TrendingUp size={12} />
              ) : spendDelta < 0 ? (
                <TrendingDown size={12} />
              ) : (
                <Minus size={12} />
              )}
              {formatCurrency(Math.abs(spendDelta))}
              {prevMonthData.totalSpend > 0 && (
                <span className="text-[9px] font-normal opacity-70">({spendDelta >= 0 ? "+" : "-"}{Math.abs(spendDeltaPct).toFixed(0)}%)</span>
              )}
            </span>
          </div>
        </div>

        {/* Plain-language insight sentence */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 mt-3 text-[10px] font-mono text-slate-600 leading-relaxed">
          {prevMonthData.totalSpend === 0 && currentMonthData.totalSpend === 0 ? (
            <>No bills scheduled in {monthNames[month]} or {prevMonthData.monthName}.</>
          ) : spendDelta === 0 ? (
            <>Spending is flat vs {prevMonthData.monthName} — no change month over month.</>
          ) : spendDelta > 0 ? (
            <>You're on track to spend <strong className="text-slate-900">{formatCurrency(Math.abs(spendDelta))} more</strong> than {prevMonthData.monthName}. Worth a quick review of what renewed this month.</>
          ) : (
            <>Nice — <strong className="text-slate-900">{formatCurrency(Math.abs(spendDelta))} less</strong> than {prevMonthData.monthName}.</>
          )}
        </div>

        {/* Breakdown of this month's subscriptions */}
        <div className="mt-3.5 pt-3 border-t border-dashed border-slate-100 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider">
              {currentMonthData.monthName} breakdown
            </span>
            <span className="font-mono text-[9px] font-bold text-slate-955 bg-slate-100/70 px-1.5 py-0.5 rounded">
              Total: {formatCurrency(currentMonthData.totalSpend)}
            </span>
          </div>

          {currentMonthData.items.length === 0 ? (
            <div className="text-center py-2 text-[9px] font-mono text-slate-400 bg-slate-50/50 border border-slate-100/50 rounded-lg">
              No bills scheduled in {currentMonthData.monthName}.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-0.5">
              {currentMonthData.items.map(item => (
                <div
                  id={`cal-spend-sub-${item.subscription.id}`}
                  key={item.subscription.id}
                  onClick={() => handleOpenDetails(item.subscription.id)}
                  className="bg-slate-50 border border-slate-100 p-2 rounded-lg flex justify-between items-center hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-900 shrink-0" />
                    <span className="font-display font-bold text-[10px] text-slate-900 truncate">
                      {item.subscription.name}
                    </span>
                    <span className="font-mono text-[7px] text-slate-400 uppercase tracking-tight shrink-0 bg-white px-1 py-0.25 rounded border border-slate-100">
                      {item.subscription.billingCycle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.occurrencesCount > 1 && (
                      <span className="font-mono text-[7.5px] text-slate-400 font-bold">
                        {item.occurrencesCount}×
                      </span>
                    )}
                    <span className="font-mono font-bold text-[10px] text-slate-950">
                      {formatCurrency(item.cost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Day Agenda schedule */}
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col gap-3">
        <h3 className="font-display font-bold text-xs text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1.5">
          Agenda: {formatReadableDate(selectedDayStr)}
        </h3>

        {selectedDateSubs.length === 0 && selectedDateTrials.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 p-5 rounded-2xl text-center text-slate-400 font-mono text-[10px] my-1 shadow-xs">
            No scheduled transactions or trial endings.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* List standard renewals */}
            {selectedDateSubs.map(sub => (
              <div
                id={`cal-agenda-sub-${sub.id}`}
                key={sub.id}
                onClick={() => handleOpenDetails(sub.id)}
                className="bg-white border border-slate-150 p-3 rounded-xl flex justify-between items-center hover:shadow-xs hover:border-slate-300 cursor-pointer transition-all"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-900" />
                    <h4 className="font-display font-bold text-xs text-slate-900">{sub.name}</h4>
                  </div>
                  <span className="font-mono text-[9px] text-slate-400 pl-3.5 uppercase">{sub.category} renewal</span>
                </div>
                <span className="font-mono font-bold text-xs text-slate-950">
                  {formatCurrency(sub.amount)}
                </span>
              </div>
            ))}

            {/* List expiring trials */}
            {selectedDateTrials.map(sub => (
              <div
                id={`cal-agenda-trial-${sub.id}`}
                key={sub.id}
                onClick={() => handleOpenDetails(sub.id)}
                className="bg-amber-50/50 border border-dashed border-amber-200 p-3 rounded-xl flex justify-between items-center hover:shadow-xs cursor-pointer transition-all"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rotate-45 bg-amber-500" />
                    <h4 className="font-display font-bold text-xs text-amber-900">{sub.name}</h4>
                  </div>
                  <span className="font-mono text-[9px] text-amber-700 pl-3.5 uppercase font-bold">FREE TRIAL EXPIRES TODAY!</span>
                </div>
                <span className="font-mono font-bold text-xs text-slate-500">
                  {formatCurrency(sub.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom spacer to prevent the floating bottom nav from overlapping the content */}
      <div className="h-36 w-full shrink-0" />

    </div>
  );
}
