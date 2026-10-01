'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Contact2,
  UploadCloud,
  UserCheck,
  Megaphone,
  PhoneCall,
  Mic,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react';
import { AdminApi } from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Teams', href: '/teams', icon: Building2 },
  { label: 'Contacts', href: '/contacts', icon: Contact2 },
  { label: 'Import Contacts', href: '/contacts/import', icon: UploadCloud },
  { label: 'Assignments', href: '/assignments', icon: UserCheck },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { label: 'Call Logs', href: '/calls', icon: PhoneCall },
  { label: 'Recordings', href: '/recordings', icon: Mic },
  { label: 'Reports & KPIs', href: '/reports', icon: BarChart3 },
  { label: 'Audit Trail', href: '/audit-logs', icon: ShieldCheck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const user = AdminApi.getCurrentUser();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/20">
          C
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-sm tracking-wide">CALLSYNC CRM</h1>
          <p className="text-xs text-slate-400">Employee Calling & CRM</p>
        </div>
      </div>


      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
            {user?.full_name ? user.full_name[0] : 'A'}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'Admin User'}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role || 'SUPER_ADMIN'}</p>
          </div>
        </div>

        <button
          onClick={() => AdminApi.logout()}
          title="Sign Out"
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
