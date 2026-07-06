import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data";
import { Tv, Cpu, Activity, ShoppingBag, Cloud, CreditCard, Layers, Check, ChevronRight } from "lucide-react";

// Map string icons to Lucide components
const iconMap: { [key: string]: React.ComponentType<any> } = {
  Tv,
  Cpu,
  Activity,
  ShoppingBag,
  Cloud,
  CreditCard,
  Layers,
};

export default function OnboardingScreen() {
  const { updateOnboardingCategories, setScreen } = useApp();
  const [selected, setSelected] = useState<string[]>(["Streaming", "Software"]);

  const toggleCategory = (cat: string) => {
    if (selected.includes(cat)) {
      setSelected(selected.filter((item) => item !== cat));
    } else {
      setSelected([...selected, cat]);
    }
  };

  const handleContinue = async () => {
    await updateOnboardingCategories(selected);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans p-6 justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          id="onboarding-back-btn"
          onClick={() => setScreen("plan")}
          className="text-xs font-mono font-bold text-slate-600 hover:text-slate-950 hover:underline cursor-pointer"
        >
          ← Back
        </button>
        <span className="font-mono text-[10px] text-slate-400">Step 4 of 4</span>
      </div>

      {/* Main Content */}
      <div className="my-auto py-6 max-w-sm mx-auto w-full">
        <div className="mb-6">
          <div className="inline-flex bg-slate-200 text-slate-700 font-mono text-[9px] font-bold px-2.5 py-1 rounded-full mb-2">
            ONBOARDING
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 uppercase leading-tight">
            What subscriptions do you want to track first?
          </h2>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Select one or more categories. This helps us customize your upcoming reminders, dashboard views, and analytics.
          </p>
        </div>

        {/* Selection Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {CATEGORIES.map((cat) => {
            const IconComponent = iconMap[cat.icon] || Layers;
            const isSelected = selected.includes(cat.value);

            return (
              <button
                id={`onboarding-cat-${cat.value}`}
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`p-4 flex flex-col items-start gap-2.5 text-left rounded-2xl transition-all cursor-pointer border ${
                  isSelected 
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm scale-[1.02]" 
                    : "bg-white text-slate-800 border-slate-200 shadow-xs hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <IconComponent size={20} className={isSelected ? "text-white" : "text-slate-900"} />
                  {isSelected && (
                    <div className="bg-white rounded-full p-0.5 shrink-0">
                      <Check size={8} className="text-black stroke-[3px]" />
                    </div>
                  )}
                </div>
                
                <div>
                  <span className="font-display font-bold text-xs tracking-tight">{cat.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer and Continue button */}
      <div className="flex flex-col gap-3 pb-4">
        <button
          id="onboarding-continue-btn"
          onClick={handleContinue}
          disabled={selected.length === 0}
          className="w-full bg-slate-900 text-white py-3.5 px-4 font-display font-bold text-center flex items-center justify-center gap-2 rounded-xl shadow-md hover:bg-slate-800 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
        >
          Continue to Dashboard
          <ChevronRight size={16} />
        </button>
        
        <p className="text-center font-mono text-[10px] text-gray-400">
          You can edit categories or customize subscription profiles at any time.
        </p>
      </div>
    </div>
  );
}
