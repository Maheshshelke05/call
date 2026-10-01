'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import {
  Users,
  PhoneCall,
  CheckCircle2,
  Clock,
  PhoneMissed,
  PhoneOff,
  CalendarClock,
  Mic,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await AdminApi.getDashboard();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatTalkTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${totalSec % 60}s`;
  };

  return (
    <div>
      <Header
        title="Operations Control Center"
        subtitle="Real-time cellular calling telemetry, employee metrics & campaign progress"
        actionButton={
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      <div className="p-8 space-y-8">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Today's Calls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Total Calls</span>
              <PhoneCall className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-extrabold text-slate-100">{stats?.today_calls ?? '--'}</div>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {stats?.connected_calls ?? 0} Connected
              </span>
              <span>•</span>
              <span>{Math.round(((stats?.connected_calls || 0) / Math.max(1, stats?.today_calls || 1)) * 100)}% Rate</span>
            </div>
          </div>

          {/* Card 2: Talk Time */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Talk Time</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-slate-100">
              {stats ? formatTalkTime(stats.total_talk_time_seconds) : '--'}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Avg Duration: <span className="text-indigo-400 font-semibold">{stats?.average_call_duration_seconds ?? 0}s / call</span>
            </div>
          </div>

          {/* Card 3: Active Employees */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Employees</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-slate-100">{stats?.active_employees ?? '--'}</div>
            <div className="mt-3 text-xs text-slate-400">
              Out of <span className="font-semibold text-slate-200">{stats?.total_employees ?? 0} total employees</span>
            </div>
          </div>

          {/* Card 4: Scheduled Callbacks */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Callbacks</span>
              <CalendarClock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-slate-100">{stats?.callbacks_count ?? '--'}</div>
            <div className="mt-3 text-xs text-amber-400/80 font-medium">Scheduled follow-up client calls</div>
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Disposition Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Call Disposition Breakdown
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-400">Connected ({stats?.connected_calls ?? 0})</span>
                  <span className="text-slate-400">
                    {Math.round(((stats?.connected_calls || 0) / Math.max(1, stats?.today_calls || 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${Math.round(((stats?.connected_calls || 0) / Math.max(1, stats?.today_calls || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-400">No Answer ({stats?.no_answer_calls ?? 0})</span>
                  <span className="text-slate-400">
                    {Math.round(((stats?.no_answer_calls || 0) / Math.max(1, stats?.today_calls || 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${Math.round(((stats?.no_answer_calls || 0) / Math.max(1, stats?.today_calls || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-400">Busy / Switched Off ({stats?.busy_calls ?? 0})</span>
                  <span className="text-slate-400">
                    {Math.round(((stats?.busy_calls || 0) / Math.max(1, stats?.today_calls || 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{
                      width: `${Math.round(((stats?.busy_calls || 0) / Math.max(1, stats?.today_calls || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recording Subsystem Badge */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-blue-400" />
                  S3 Recordings Stored:
                </span>
                <span className="font-bold text-slate-100">
                  {stats?.recording_availability_stats?.available ?? 0} Files
                </span>
              </div>
            </div>
          </div>

          {/* Calls by Hour Today */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">
              Calling Activity By Hour (9:00 AM – 8:00 PM)
            </h3>

            <div className="h-48 flex items-end gap-3 pt-6 pb-2 border-b border-slate-800">
              {stats?.calls_by_hour?.map((h: any) => {
                const heightPercent = Math.min(100, Math.max(12, (h.calls / 10) * 100));
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {h.calls}
                    </span>
                    <div className="w-full bg-slate-950 rounded-t-lg overflow-hidden flex flex-col justify-end h-32">
                      <div
                        className="w-full bg-blue-600 group-hover:bg-blue-500 transition-all rounded-t-lg"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">{h.hour}</span>
                  </div>
                );
              })}
            </div>

            {/* Active Campaigns List */}
            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Active Campaigns Telecalling Progress
              </h4>
              <div className="space-y-3">
                {stats?.campaign_progress?.map((camp: any) => (
                  <div key={camp.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{camp.name}</p>
                      <p className="text-xs text-slate-500">
                        {camp.completed_calls} of {camp.total_contacts} leads dialed
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${camp.percentage}%` }} />
                      </div>
                      <span className="text-xs font-bold text-indigo-400">{camp.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
