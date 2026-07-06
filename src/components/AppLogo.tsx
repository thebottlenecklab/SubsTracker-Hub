import React from "react";

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className = "" }: AppLogoProps) {
  return (
    <div className={`flex items-center gap-2 select-none min-w-max shrink-0 ${className}`}>
      {/* Icon Badge */}
      <div className="h-8 w-8 rounded-xl bg-[#3E5F4A] flex items-center justify-center shrink-0 shadow-xs">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 40 40" 
          className="h-4.5 w-4.5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Minimalist Security Lock Symbol */}
          <rect x="13" y="20" width="14" height="10" rx="2" />
          <path d="M16 20v-4a4 4 0 1 1 8 0v4" />
        </svg>
      </div>
      
      {/* Branding Text */}
      <div className="flex flex-col justify-center leading-none">
        <span className="font-sans font-black text-sm tracking-tight text-[#0D1612] leading-none">
          SubsTracker Hub
        </span>
        <span className="font-mono text-[6.5px] font-bold tracking-[0.14em] text-[#657F73] leading-none mt-1 uppercase">
          PRIVACY LEDGER
        </span>
      </div>
    </div>
  );
}

