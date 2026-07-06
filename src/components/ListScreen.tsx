import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data";
import { formatCurrency, formatReadableDate, getDaysRemaining } from "../utils";
import { Search, Filter, ChevronRight, Play, Pause, AlertCircle, RefreshCw, Star, ArrowUpDown } from "lucide-react";
import { SubscriptionCategory } from "../types";

export default function ListScreen() {
  const { subscriptions, setSelectedSubId, setScreen } = useApp();
  const [search, setSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date");

  // Filter and Sort Subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.name.toLowerCase().includes(search.toLowerCase()) || 
                          (sub.notes && sub.notes.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || sub.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort logic
  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    if (sortBy === "amount") {
      return b.amount - a.amount;
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else {
      // Sort by next charge date (closest first)
      const daysA = getDaysRemaining(a.nextChargeDate);
      const daysB = getDaysRemaining(b.nextChargeDate);
      return daysA - daysB;
    }
  });

  const handleOpenDetails = (id: string) => {
    setSelectedSubId(id);
    setScreen("details");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-5 pb-24 select-none animate-fade-in">
      
      {/* Header bar */}
      <div className="flex items-center justify-between pt-4 pb-3 border-b border-slate-200 mb-4">
        <div>
          <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-widest">Manual Registers</span>
          <h1 className="font-display font-extrabold text-xl text-slate-950 uppercase tracking-tight">Subscriptions ({subscriptions.length})</h1>
        </div>
        <button
          id="list-add-new-btn"
          onClick={() => setScreen("add")}
          className="bg-slate-900 text-white py-1.5 px-3.5 font-display font-bold text-xs rounded-xl shadow-sm hover:bg-slate-800 transition-colors cursor-pointer"
        >
          + Add New
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-3 max-w-sm mx-auto w-full">
        <input
          id="list-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search service name or notes..."
          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans shadow-xs"
        />
        <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
      </div>

      {/* Horizontal Category Filters list */}
      <div className="max-w-sm mx-auto w-full mb-4">
        <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none -mx-1 px-1">
          <button
            id="filter-category-all"
            onClick={() => setSelectedCategory("All")}
            className={`shrink-0 py-1 px-3.5 text-[10px] font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer border ${
              selectedCategory === "All"
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-xs"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              id={`filter-category-${cat.value}`}
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`shrink-0 py-1 px-3.5 text-[10px] font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer border ${
                selectedCategory === cat.value
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="max-w-sm mx-auto w-full flex justify-between items-center mb-3 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1">
          <Filter size={10} />
          <span>Showing {sortedSubscriptions.length} items</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={10} />
          <span>Sort:</span>
          <select
            id="list-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent border-none text-slate-900 font-bold focus:outline-none cursor-pointer underline py-0 px-1"
          >
            <option value="date">Next Charge</option>
            <option value="amount">Amount</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Listing Container */}
      <div className="flex-1 max-w-sm mx-auto w-full flex flex-col gap-2.5">
        {sortedSubscriptions.length === 0 ? (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center flex flex-col gap-2 items-center my-4">
            <AlertCircle size={20} className="text-slate-400" />
            <p className="font-display font-bold text-xs text-slate-800">No matching subscriptions</p>
            <p className="text-[10px] text-slate-500">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          sortedSubscriptions.map((sub) => {
            const days = getDaysRemaining(sub.nextChargeDate);
            const isPaused = sub.status === "paused";
            const isCanceled = sub.status === "canceled";
            const isTrial = sub.isFreeTrial;

            return (
              <div
                id={`list-sub-item-${sub.id}`}
                key={sub.id}
                onClick={() => handleOpenDetails(sub.id)}
                className={`bg-white border border-slate-150 p-3 rounded-xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex justify-between items-center hover:border-slate-300 ${
                  isPaused || isCanceled ? "opacity-75 bg-slate-50/50 border-slate-200 border-dashed" : ""
                }`}
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display font-bold text-xs text-slate-900 truncate">
                      {sub.name}
                    </h3>
                    
                    {/* Free Trial Badge */}
                    {isTrial && (
                      <span className="font-mono text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold py-0.5 px-1.5 rounded-lg shrink-0 scale-90 uppercase">
                        TRIAL
                      </span>
                    )}

                    {/* Status badges */}
                    {isPaused && (
                      <span className="font-mono text-[8px] bg-slate-100 text-slate-600 font-bold py-0.5 px-1.5 border border-slate-200 rounded-lg shrink-0 scale-90 uppercase">
                        PAUSED
                      </span>
                    )}

                    {isCanceled && (
                      <span className="font-mono text-[8px] bg-rose-50 text-rose-700 font-bold py-0.5 px-1.5 border border-rose-200 rounded-lg shrink-0 scale-90 uppercase">
                        CANCELED
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 items-center text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[80px]">{sub.category}</span>
                    <span>•</span>
                    <span>{formatReadableDate(sub.nextChargeDate)}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col gap-1 items-end shrink-0">
                  <span className="font-mono font-bold text-xs text-slate-950">
                    {formatCurrency(sub.amount)}
                  </span>
                  <span className="font-mono text-[8px] text-slate-400 uppercase tracking-tight">
                    {sub.billingCycle}
                  </span>
                </div>
                
                <ChevronRight size={14} className="text-slate-400 shrink-0 ml-1.5" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
