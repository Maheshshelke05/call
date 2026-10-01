'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import { BarChart3, Trophy, PieChart, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AdminApi.getReports()
      .then(setReportData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header
        title="Telephony Analytics & Performance Reports"
        subtitle="Agent efficiency, connect conversion rates, and outcome distribution"
      />

      <div className="p-8 space-y-8">
        {/* Agent Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Agent Calling Performance Leaderboard
          </h3>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Agent Name</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Total Calls Dialed</th>
                  <th className="px-6 py-4">Connected Calls</th>
                  <th className="px-6 py-4 text-right">Connect Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reportData?.employee_performance?.map((emp: any, idx: number) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-100">{emp.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{emp.role}</td>
                    <td className="px-6 py-4 font-semibold text-slate-200">{emp.total_calls}</td>
                    <td className="px-6 py-4 text-emerald-400 font-semibold">{emp.connected_calls}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-blue-400">
                      {emp.connection_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dispositions Distribution Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-6 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-400" />
            Outcome Dispositions Volume
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {reportData?.disposition_distribution?.map((d: any) => (
              <div key={d.code} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold">{d.label}</span>
                <p className="text-2xl font-extrabold text-slate-100 mt-2">{d.count}</p>
                <span className="text-[11px] font-mono text-slate-500 mt-1 block">{d.code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
