'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Activity,
  Code,
  CheckCircle2,
  X
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await AdminApi.getAuditLogs(undefined, 100, 0);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.ip_address?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase());

    const matchesAction = !actionFilter || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    if (action.includes('RECORDING')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (action.includes('DELETE') || action.includes('REVOKE')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (action.includes('CREATE') || action.includes('ASSIGN')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div>
      <Header
        title="Audit & Security Logs"
        subtitle="Immutable security trail of authentication, call events, recording access, and CRM mutations"
      />

      <div className="p-8 space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search action, actor, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Action Types</option>
              <option value="EMPLOYEE_LOGIN">EMPLOYEE_LOGIN</option>
              <option value="PLAY_RECORDING">PLAY_RECORDING</option>
              <option value="DOWNLOAD_RECORDING">DOWNLOAD_RECORDING</option>
              <option value="IMPORT_CONTACTS_CONFIRM">IMPORT_CONTACTS_CONFIRM</option>
              <option value="CREATE_CAMPAIGN">CREATE_CAMPAIGN</option>
              <option value="ASSIGN_CONTACTS">ASSIGN_CONTACTS</option>
              <option value="UPDATE_SYSTEM_SETTINGS">UPDATE_SYSTEM_SETTINGS</option>
            </select>

            <button
              onClick={fetchLogs}
              className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading audit records...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No audit events found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-semibold text-slate-200">
                            {log.actor_name || `Actor #${log.actor_id || 'System'}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {log.entity_type ? (
                          <span className="text-slate-300 font-mono">
                            {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {log.payload_json ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700 transition-colors"
                          >
                            <Code className="w-3.5 h-3.5 text-blue-400" />
                            View JSON
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">None</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* JSON Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-slate-100">Audit Payload Event #{selectedLog.id}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-slate-500">Action:</span>
                  <div className="font-bold text-slate-200 mt-0.5">{selectedLog.action}</div>
                </div>
                <div>
                  <span className="text-slate-500">Actor:</span>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {selectedLog.actor_name || `ID ${selectedLog.actor_id}`}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp:</span>
                  <div className="font-mono text-slate-300 mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">IP Address:</span>
                  <div className="font-mono text-slate-300 mt-0.5">
                    {selectedLog.ip_address || 'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Payload JSON
                </label>
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.payload_json), null, 2);
                    } catch {
                      return selectedLog.payload_json;
                    }
                  })()}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
