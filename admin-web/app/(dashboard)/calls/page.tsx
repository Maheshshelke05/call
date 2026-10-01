'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import { PhoneCall, Clock, Mic, CheckCircle2, XCircle, Search, RefreshCw } from 'lucide-react';

export default function CallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const data = await AdminApi.getCalls();
      setCalls(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div>
      <Header
        title="Live Call Activity & Audit Logs"
        subtitle="Immutable cellular call logs synchronized with client idempotency verification"
        actionButton={
          <button
            onClick={loadCalls}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        }
      />

      <div className="p-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Calling Agent</th>
                <th className="px-6 py-4">SIM Used</th>
                <th className="px-6 py-4">Talk Time</th>
                <th className="px-6 py-4">Disposition</th>
                <th className="px-6 py-4">Recording</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading call logs...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No calls recorded yet. Dial a contact from the mobile app to see live events.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-100">{call.contact_name || 'Customer'}</div>
                      <div className="text-xs font-mono text-blue-400 font-semibold">
                        {call.phone_number_snapshot}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">
                      {call.employee_name || `Agent #${call.employee_id}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                        SIM {call.sim_slot + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          call.disposition_code === 'CONNECTED' || call.disposition_code === 'INTERESTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : call.disposition_code === 'NO_ANSWER'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {call.disposition_label || call.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {call.recording_id ? (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-400 font-semibold">
                          <Mic className="w-3.5 h-3.5" />
                          Audio Synced
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Not recorded</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(call.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
