import React from "react";
import { useApp } from "../context/AppContext";
import { Home, List, Plus, Calendar, BarChart3, Settings } from "lucide-react";

export default function BottomNav() {
  const { activeTab, setTab, setScreen } = useApp();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 pt-5 pb-3 px-4 z-50 shadow-[0_-4px_20px_-4px_rgba(148,163,184,0.12)]">
      
      {/* Small floating Add button placed nicely above the menus */}
      <div className="absolute -top-[18px] left-1/2 -translate-x-1/2">
        <button
          id="nav-tab-add"
          onClick={() => setScreen("add")}
          title="Add Subscription"
          className="flex items-center justify-center bg-slate-950 text-white h-9 w-9 rounded-full shadow-md hover:bg-slate-800 transition-all cursor-pointer hover:scale-110 active:scale-95 border-2 border-white"
        >
          <Plus size={18} className="stroke-[3px]" />
        </button>
      </div>

      <div className="max-w-md mx-auto w-full flex justify-between items-center font-mono text-[9px] font-bold uppercase text-slate-500">
        
        {/* Home Tab */}
        <button
          id="nav-tab-home"
          onClick={() => setTab("home")}
          className={`flex flex-col items-center gap-1.5 py-1 px-3 transition-colors cursor-pointer ${
            activeTab === "home" ? "text-slate-900 scale-105 font-extrabold" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          <Home size={17} className={activeTab === "home" ? "stroke-[2.5px] text-slate-900" : "stroke-[1.5px]"} />
          <span>Home</span>
        </button>

        {/* Subscriptions Tab */}
        <button
          id="nav-tab-subs"
          onClick={() => setTab("subscriptions")}
          className={`flex flex-col items-center gap-1.5 py-1 px-3 transition-colors cursor-pointer ${
            activeTab === "subscriptions" ? "text-slate-900 scale-105 font-extrabold" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          <List size={17} className={activeTab === "subscriptions" ? "stroke-[2.5px] text-slate-900" : "stroke-[1.5px]"} />
          <span>Subs</span>
        </button>

        {/* Calendar Tab */}
        <button
          id="nav-tab-calendar"
          onClick={() => setTab("calendar")}
          className={`flex flex-col items-center gap-1.5 py-1 px-3 transition-colors cursor-pointer ${
            activeTab === "calendar" ? "text-slate-900 scale-105 font-extrabold" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          <Calendar size={17} className={activeTab === "calendar" ? "stroke-[2.5px] text-slate-900" : "stroke-[1.5px]"} />
          <span>Calendar</span>
        </button>

        {/* Metrics Tab */}
        <button
          id="nav-tab-metrics"
          onClick={() => setTab("metrics")}
          className={`flex flex-col items-center gap-1.5 py-1 px-3 transition-colors cursor-pointer ${
            activeTab === "metrics" ? "text-slate-900 scale-105 font-extrabold" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          <BarChart3 size={17} className={activeTab === "metrics" ? "stroke-[2.5px] text-slate-900" : "stroke-[1.5px]"} />
          <span>Metrics</span>
        </button>

        {/* Settings Tab */}
        <button
          id="nav-tab-settings"
          onClick={() => setTab("settings")}
          className={`flex flex-col items-center gap-1.5 py-1 px-3 transition-colors cursor-pointer ${
            activeTab === "settings" ? "text-slate-900 scale-105 font-extrabold" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          <Settings size={17} className={activeTab === "settings" ? "stroke-[2.5px] text-slate-900" : "stroke-[1.5px]"} />
          <span>Settings</span>
        </button>

      </div>
    </div>
  );
}
