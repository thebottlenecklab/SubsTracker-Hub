import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { formatCurrency, getYearlySpendData, MonthlySpendBreakdown, MonthlySpendItem } from "../utils";
import { 
  TrendingUp, 
  DollarSign, 
  Calendar as CalendarIcon, 
  Layers, 
  ArrowUpRight, 
  HelpCircle, 
  ChevronRight, 
  Info,
  Tv,
  Activity,
  Heart,
  Home as HomeIcon,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Subscription, SubscriptionCategory } from "../types";

// Helper to map category to Lucide Icons
const getCategoryIcon = (category: SubscriptionCategory) => {
  switch (category) {
    case "Streaming":
      return <Tv size={14} className="text-blue-500" />;
    case "Software":
      return <Layers size={14} className="text-indigo-500" />;
    case "Fitness":
      return <Activity size={14} className="text-emerald-500" />;
    case "Family":
      return <Heart size={14} className="text-rose-500" />;
    case "Utility":
      return <HomeIcon size={14} className="text-amber-500" />;
    case "Finance":
      return <CreditCard size={14} className="text-purple-500" />;
    default:
      return <ShoppingBag size={14} className="text-slate-500" />;
  }
};

export default function MetricsScreen() {
  const { subscriptions } = useApp();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(5); // Default to June (index 5)
  const [insightTab, setInsightTab] = useState<"bills" | "amortized">("bills");
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  const monthNames = [
    "J", "F", "Ma", "A", "M", "Jn",
    "J", "Au", "S", "O", "N", "D"
  ];

  const fullMonthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calculate actual scheduled bills for each month of the year
  const yearlyBreakdown = useMemo<MonthlySpendBreakdown[]>(() => {
    return getYearlySpendData(subscriptions, selectedYear);
  }, [subscriptions, selectedYear]);

  // Calculate Amortized Monthly Spend (Average line flat value)
  const amortizedMonthlySpend = useMemo(() => {
    return subscriptions
      .filter(sub => sub.status === "active")
      .reduce((sum, sub) => {
        let val = sub.amount;
        if (sub.billingCycle === "weekly") {
          val = (sub.amount * 52) / 12;
        } else if (sub.billingCycle === "quarterly") {
          val = sub.amount / 3;
        } else if (sub.billingCycle === "yearly") {
          val = sub.amount / 12;
        }
        return sum + val;
      }, 0);
  }, [subscriptions]);

  // Max spend in any month to scale the bar heights proportionately
  const maxSpend = useMemo(() => {
    const max = Math.max(...yearlyBreakdown.map(m => m.totalSpend));
    return max > 0 ? max : 50; // default minimum scale if no spending
  }, [yearlyBreakdown]);

  // Selected Month Details
  const selectedMonthData = yearlyBreakdown[selectedMonthIdx];

  // Map each month's spend into chart coordinates (0-100 percentage space) for the line chart
  const chartPoints = useMemo(() => {
    const leftPad = 3, rightPad = 3, topPad = 12, bottomPad = 6;
    const usableX = 100 - leftPad - rightPad;
    const usableY = 100 - topPad - bottomPad;

    return yearlyBreakdown.map((monthData, idx) => {
      const spend = insightTab === "bills" ? monthData.totalSpend : amortizedMonthlySpend;
      const spendPct = maxSpend > 0 ? Math.min(spend / maxSpend, 1) : 0;
      const x = leftPad + (idx / (yearlyBreakdown.length - 1)) * usableX;
      const y = topPad + (1 - spendPct) * usableY;
      return { x, y, spend, monthName: monthData.monthName };
    });
  }, [yearlyBreakdown, insightTab, amortizedMonthlySpend, maxSpend]);

  // Dynamic Insight Generation
  const highestSpendMonth = useMemo(() => {
    let best = yearlyBreakdown[0];
    yearlyBreakdown.forEach(m => {
      if (m.totalSpend > best.totalSpend) {
        best = m;
      }
    });
    return best;
  }, [yearlyBreakdown]);

  const topCategory = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    subscriptions.filter(s => s.status === "active").forEach(sub => {
      categoryTotals[sub.category] = (categoryTotals[sub.category] || 0) + sub.amount;
    });

    let topCat = "None";
    let maxVal = 0;
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        topCat = cat;
      }
    });
    return { name: topCat, value: maxVal };
  }, [subscriptions]);

  // Spend by category, amortized to a monthly figure so weekly/quarterly/yearly bills compare fairly
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    subscriptions.filter(s => s.status === "active").forEach(sub => {
      let monthlyVal = sub.amount;
      if (sub.billingCycle === "weekly") monthlyVal = (sub.amount * 52) / 12;
      else if (sub.billingCycle === "quarterly") monthlyVal = sub.amount / 3;
      else if (sub.billingCycle === "yearly") monthlyVal = sub.amount / 12;

      totals[sub.category] = (totals[sub.category] || 0) + monthlyVal;
      grandTotal += monthlyVal;
    });

    return Object.entries(totals)
      .map(([category, monthlyTotal]) => ({
        category: category as SubscriptionCategory,
        monthlyTotal,
        pct: grandTotal > 0 ? (monthlyTotal / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
  }, [subscriptions]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-5 pb-24 select-none animate-fade-in">
      
      {/* Top Header bar */}
      <div className="flex items-center justify-between pt-4 pb-3 border-b border-slate-200 mb-4">
        <div>
          <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-widest">Analytics Ledger</span>
          <h1 className="font-display font-extrabold text-xl text-slate-950 uppercase tracking-tight">Metrics</h1>
        </div>
        
        {/* Year Toggle */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
          <button 
            id="metrics-year-2026-btn"
            onClick={() => setSelectedYear(2026)}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
              selectedYear === 2026 ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            2026
          </button>
          <button 
            id="metrics-year-2027-btn"
            onClick={() => setSelectedYear(2027)}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
              selectedYear === 2027 ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            2027
          </button>
        </div>
      </div>

      <div className="max-w-sm mx-auto w-full flex flex-col gap-4">
        
        {/* Quick Insights Cards Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-white border border-slate-150 p-3.5 rounded-2xl shadow-xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] text-slate-400 uppercase font-bold tracking-wider">Scheduled {monthNames[selectedMonthIdx]}</span>
              <DollarSign size={13} className="text-slate-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-base font-extrabold text-slate-950">
                {formatCurrency(selectedMonthData.totalSpend)}
              </span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Actual cash flow</span>
            </div>
          </div>

          <div className="bg-white border border-slate-150 p-3.5 rounded-2xl shadow-xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] text-slate-400 uppercase font-bold tracking-wider">Flat Amortized</span>
              <TrendingUp size={13} className="text-emerald-500 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-base font-extrabold text-slate-950">
                {formatCurrency(amortizedMonthlySpend)}
              </span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Smooth monthly average</span>
            </div>
          </div>
        </div>

        {/* Forecast View Switcher */}
        <div className="bg-slate-100/70 border border-slate-150 p-1 rounded-xl flex">
          <button 
            id="metrics-toggle-bills"
            onClick={() => setInsightTab("bills")}
            className={`flex-1 py-1.5 text-center font-mono text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              insightTab === "bills" 
                ? "bg-white text-slate-900 shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Actual Scheduled Charges
          </button>
          <button 
            id="metrics-toggle-amortized"
            onClick={() => setInsightTab("amortized")}
            className={`flex-1 py-1.5 text-center font-mono text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              insightTab === "amortized" 
                ? "bg-white text-slate-900 shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Amortized Spend Forecast
          </button>
        </div>

        {/* 12-Month Line Chart Card */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-md flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900"></div>

          <div className="flex justify-between items-center mt-1">
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider">Spend Trend Line</span>
              <h2 className="font-display font-extrabold text-sm text-slate-900">
                {insightTab === "bills" ? `Cash Flow Projection (${selectedYear})` : `Leveled Monthly Commitments`}
              </h2>
            </div>
            <span className="font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-600">
              HOVER OR TAP FOR DETAIL
            </span>
          </div>

          {/* Chart Wrapper */}
          <div className="flex flex-col gap-3 mt-1.5">

            {/* The 12-month line chart container */}
            <div
              className="relative h-44 border-b border-slate-100 pb-1 pt-6 px-1"
              onMouseLeave={() => setHoveredMonthIdx(null)}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="spendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`${chartPoints[0].x},100 ${chartPoints.map(p => `${p.x},${p.y}`).join(" ")} ${chartPoints[chartPoints.length - 1].x},100`}
                  fill="url(#spendAreaGradient)"
                />
                <polyline
                  points={chartPoints.map(p => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>

              {/* Point markers rendered as plain HTML so they stay perfectly circular and can host tooltips */}
              {chartPoints.map((p, idx) => {
                const isSelected = idx === selectedMonthIdx;
                const isHovered = idx === hoveredMonthIdx;
                const showTooltip = (isSelected || isHovered) && p.spend > 0;

                return (
                  <button
                    key={monthNames[idx] + idx}
                    type="button"
                    onClick={() => setSelectedMonthIdx(idx)}
                    onMouseEnter={() => setHoveredMonthIdx(idx)}
                    onFocus={() => setHoveredMonthIdx(idx)}
                    onBlur={() => setHoveredMonthIdx(null)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-transparent border-0 p-0 m-0 cursor-pointer"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    <span
                      className={`block rounded-full transition-all ${
                        isSelected
                          ? "h-3 w-3 bg-slate-900 ring-4 ring-slate-900/10"
                          : isHovered
                          ? "h-2.5 w-2.5 bg-slate-700"
                          : "h-2 w-2 bg-white border-2 border-slate-300"
                      }`}
                    />

                    {showTooltip && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 bg-slate-900 text-white text-[9px] font-mono font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                        {p.monthName.slice(0, 3)} &middot; {formatCurrency(p.spend)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Month abbreviation labels */}
            <div className="flex justify-between px-1">
              {monthNames.map((m, idx) => (
                <button
                  key={m + idx}
                  type="button"
                  onClick={() => setSelectedMonthIdx(idx)}
                  onMouseEnter={() => setHoveredMonthIdx(idx)}
                  onMouseLeave={() => setHoveredMonthIdx(null)}
                  className={`flex-1 text-center font-mono text-[8.5px] font-bold transition-colors cursor-pointer bg-transparent border-0 ${
                    idx === selectedMonthIdx ? "text-slate-950 font-extrabold" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Quick visual baseline helper */}
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-1">
              <span>Low: $0</span>
              {insightTab === "bills" && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 py-0.5 px-2 rounded-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                  <span>Interactive Peaks Forecasting</span>
                </div>
              )}
              <span>Max: {formatCurrency(maxSpend)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Insight Bullet Card */}
        <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl shadow-md flex items-start gap-3">
          <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 flex flex-col gap-0.5 text-xs font-sans">
            <span className="font-mono text-[8px] font-bold uppercase text-slate-400 tracking-wider">Subscription Smart Insight</span>
            <p className="leading-snug text-slate-300">
              {highestSpendMonth.totalSpend > 0 ? (
                <>
                  In <strong className="text-white">{selectedYear}</strong>, your highest spending peak falls in <strong className="text-white">{highestSpendMonth.monthName}</strong> with a total bill of <strong className="text-white">{formatCurrency(highestSpendMonth.totalSpend)}</strong>. 
                  {topCategory.value > 0 && (
                    <span> Your most intense subscription vertical is <strong className="text-white">{topCategory.name}</strong>, committing <strong className="text-white">{formatCurrency(topCategory.value)}/mo</strong> flat.</span>
                  )}
                </>
              ) : (
                "You don't have any active recurring subscriptions populated yet. Create a standard billing subscription under the 'Subs' page to map your monthly forecast dashboard!"
              )}
            </p>
          </div>
        </div>

        {/* Spend by Category Breakdown */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-md flex flex-col gap-3.5">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider">Where It Goes</span>
            <h2 className="font-display font-extrabold text-sm text-slate-900">Spend by Category</h2>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-4 text-[10px] font-mono text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-lg">
              No active subscriptions to categorize yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {categoryBreakdown.map((row) => (
                <div key={row.category} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {getCategoryIcon(row.category)}
                      <span className="font-display font-bold text-xs text-slate-900">{row.category}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-950">{formatCurrency(row.monthlyTotal)}/mo</span>
                      <span className="font-mono text-[9px] text-slate-400">{row.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full transition-all"
                      style={{ width: `${Math.max(row.pct, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Month Spend Ledger Breakdown */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
            <h3 className="font-display font-bold text-xs text-slate-900 uppercase tracking-wide">
              {fullMonthNames[selectedMonthIdx]} {selectedYear} Breakdown
            </h3>
            <span className="font-mono text-[10px] text-slate-500 font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-xs">
              {selectedMonthData.items.length} accounts
            </span>
          </div>

          {selectedMonthData.items.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 p-6 rounded-2xl text-center text-slate-400 font-mono text-[10px] shadow-xs">
              No bills scheduled for {fullMonthNames[selectedMonthIdx]} {selectedYear}.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedMonthData.items.map((item, i) => {
                const sub = item.subscription;
                
                return (
                  <div
                    id={`metrics-sub-item-${sub.id}`}
                    key={sub.id}
                    className="bg-white border border-slate-150 p-3.5 rounded-xl flex flex-col gap-2 shadow-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                          {getCategoryIcon(sub.category)}
                        </div>
                        <div className="flex flex-col">
                          <h4 className="font-display font-bold text-xs text-slate-950 leading-tight">{sub.name}</h4>
                          <span className="font-mono text-[9px] text-slate-400 uppercase tracking-tight mt-0.5">
                            {sub.billingCycle} charge
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-slate-950">
                          {formatCurrency(item.cost)}
                        </div>
                        {item.occurrencesCount > 1 && (
                          <div className="font-mono text-[8px] text-slate-400 mt-0.5">
                            {item.occurrencesCount} charges × {formatCurrency(sub.amount)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Scheduled dates details in this month */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-2 flex flex-col gap-1 text-[9px] font-mono text-slate-500 leading-relaxed">
                      <div className="flex justify-between">
                        <span>Due Dates:</span>
                        <span className="font-bold text-slate-700">
                          {item.billingDates.map(d => {
                            const dayNum = parseInt(d.split("-")[2], 10);
                            return `${fullMonthNames[selectedMonthIdx].slice(0,3)} ${dayNum}`;
                          }).join(", ")}
                        </span>
                      </div>
                      {sub.isFreeTrial && (
                        <div className="flex items-center gap-1 text-amber-600 font-bold">
                          <AlertCircle size={10} />
                          <span>Note: Marked as Active Free Trial.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom spacer to prevent the floating bottom nav from overlapping the content */}
        <div className="h-36 w-full shrink-0" />

      </div>

    </div>
  );
}
