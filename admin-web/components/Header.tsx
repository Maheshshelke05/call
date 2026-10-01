'use client';

import React from 'react';
import { Bell, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actionButton }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {actionButton}

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-400">TELEPHONY READY</span>
        </div>
      </div>
    </header>
  );
};
