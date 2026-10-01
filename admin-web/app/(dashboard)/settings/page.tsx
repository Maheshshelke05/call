'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import {
  Settings,
  Shield,
  PhoneCall,
  Database,
  Save,
  CheckCircle2,
  Plus,
  AlertTriangle,
  Radio,
  Sliders,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    recording_enabled: 'true',
    recording_notice_enabled: 'false',
    recording_retention_days: '90',
    recording_access_role: 'ADMIN',
    recording_download_allowed: 'false',
    daily_call_target_default: '50',
    sim_preference_enforcement: 'STRICT',
  });
  const [dispositions, setDispositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showAddDispModal, setShowAddDispModal] = useState(false);
  const [newDisp, setNewDisp] = useState({
    code: '',
    label: '',
    is_connected: false,
    requires_callback: false,
    is_active: true,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await AdminApi.getSettings();
      if (data.settings) setSettings(data.settings);
      if (data.dispositions) setDispositions(data.dispositions);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await AdminApi.updateSettings(settings);
      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDisposition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisp.code || !newDisp.label) return;
    try {
      const created = await AdminApi.createDisposition(newDisp);
      setDispositions((prev) => [...prev, created]);
      setShowAddDispModal(false);
      setNewDisp({
        code: '',
        label: '',
        is_connected: false,
        requires_callback: false,
        is_active: true,
      });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create disposition');
    }
  };

  const handleToggleDispActive = async (id: number, currentActive: boolean) => {
    try {
      const updated = await AdminApi.updateDisposition(id, { is_active: !currentActive });
      setDispositions((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: updated.is_active } : d))
      );
    } catch (err) {
      console.error('Failed to update disposition', err);
    }
  };

  return (
    <div>
      <Header
        title="Platform & Telephony Settings"
        subtitle="Configure recording compliance, call retention, SIM rules, and call disposition codes"
      />

      <div className="p-8 space-y-8 max-w-6xl">
        {successMsg && (
          <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            {successMsg}
          </div>
        )}

        {/* Section 1: Call Recording & Compliance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-slate-100">Cellular Call Recording & Compliance</h3>
                <p className="text-xs text-slate-400">
                  Manage privacy safeguards, storage lifecycle, and agent audio policies
                </p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full">
              S3 Private Bucket
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recording Enabled */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Cellular Recording Subsystem
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Capture voice stream via Shizuku/MediaRecorder where supported
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleSettingChange(
                    'recording_enabled',
                    settings.recording_enabled === 'true' ? 'false' : 'true'
                  )
                }
                className="text-2xl text-blue-500 hover:text-blue-400 transition-colors"
              >
                {settings.recording_enabled === 'true' ? (
                  <ToggleRight className="w-8 h-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>

            {/* Notice / Consent */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Consent Audio Notice
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Play automated legal call recording announcement to contact
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleSettingChange(
                    'recording_notice_enabled',
                    settings.recording_notice_enabled === 'true' ? 'false' : 'true'
                  )
                }
                className="text-2xl text-blue-500 hover:text-blue-400 transition-colors"
              >
                {settings.recording_notice_enabled === 'true' ? (
                  <ToggleRight className="w-8 h-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>

            {/* Retention Days */}
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Recording Retention Lifecycle (Days)
              </label>
              <input
                type="number"
                min="7"
                max="365"
                value={settings.recording_retention_days || '90'}
                onChange={(e) => handleSettingChange('recording_retention_days', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                Recordings older than this threshold are purged from AWS S3 storage automatically.
              </p>
            </div>

            {/* Download Allowed */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Allow Audio Downloads
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Allow Team Leads to download offline MP4/AAC files (Audit logged)
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleSettingChange(
                    'recording_download_allowed',
                    settings.recording_download_allowed === 'true' ? 'false' : 'true'
                  )
                }
                className="text-2xl text-blue-500 hover:text-blue-400 transition-colors"
              >
                {settings.recording_download_allowed === 'true' ? (
                  <ToggleRight className="w-8 h-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Dialing & SIM Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Radio className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-slate-100">SIM Slot & Calling Targets</h3>
              <p className="text-xs text-slate-400">
                Android Telecom dual-SIM enforcement rules and agent daily quotas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Default Daily Call Target Per Agent
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={settings.daily_call_target_default || '50'}
                onChange={(e) => handleSettingChange('daily_call_target_default', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                Shown on employee dashboard as target progress circle.
              </p>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                SIM Preference Enforcement Policy
              </label>
              <select
                value={settings.sim_preference_enforcement || 'STRICT'}
                onChange={(e) =>
                  handleSettingChange('sim_preference_enforcement', e.target.value)
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="STRICT">STRICT (Do not dial if configured work SIM is missing)</option>
                <option value="PROMPT">PROMPT (Prompt employee on phone if configured SIM absent)</option>
                <option value="FALLBACK">FALLBACK (Permit dialing with alternate SIM slot)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Ensures personal SIM is never silently billed for business calls.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Section 3: Call Dispositions Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-slate-100">Configurable Call Dispositions</h3>
                <p className="text-xs text-slate-400">
                  Standardized outcomes required after every mobile call completion
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddDispModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Add Disposition
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Label</th>
                  <th className="px-6 py-3.5">Counted as Connected?</th>
                  <th className="px-6 py-3.5">Triggers Callback?</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dispositions.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-200">
                      {d.code}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-100">{d.label}</td>
                    <td className="px-6 py-3.5">
                      {d.is_connected ? (
                        <span className="text-xs text-emerald-400 font-semibold">Yes</span>
                      ) : (
                        <span className="text-xs text-slate-500">No</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {d.requires_callback ? (
                        <span className="text-xs text-amber-400 font-semibold">Required</span>
                      ) : (
                        <span className="text-xs text-slate-500">Optional</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleDispActive(d.id, d.is_active)}
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          d.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {d.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Disposition Modal */}
      {showAddDispModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Add Call Disposition</h3>
            <form onSubmit={handleCreateDisposition} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Code (Uppercase, No spaces)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WHATSAPP_SENT"
                  value={newDisp.code}
                  onChange={(e) =>
                    setNewDisp({ ...newDisp, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  User Friendly Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WhatsApp Details Sent"
                  value={newDisp.label}
                  onChange={(e) => setNewDisp({ ...newDisp, label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="disp_conn"
                  checked={newDisp.is_connected}
                  onChange={(e) => setNewDisp({ ...newDisp, is_connected: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="disp_conn" className="text-sm text-slate-300">
                  Counts toward Connected Calls KPI
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="disp_cb"
                  checked={newDisp.requires_callback}
                  onChange={(e) => setNewDisp({ ...newDisp, requires_callback: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="disp_cb" className="text-sm text-slate-300">
                  Forces agent to schedule Callback
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDispModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/30"
                >
                  Add Disposition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
