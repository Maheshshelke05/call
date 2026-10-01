'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import { Megaphone, Plus, Calendar, Target, X } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetCalls, setTargetCalls] = useState('500');
  const [priority, setPriority] = useState('2');

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await AdminApi.getCampaigns();
      setCampaigns(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await AdminApi.createCampaign({
        name,
        description,
        target_calls: parseInt(targetCalls, 10),
        priority: parseInt(priority, 10),
      });
      setShowModal(false);
      setName('');
      setDescription('');
      loadCampaigns();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create campaign');
    }
  };

  return (
    <div>
      <Header
        title="Telecalling Campaigns"
        subtitle="Manage targeted outbound calling initiatives, target quotas and completion rates"
        actionButton={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        }
      />

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <div key={camp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      camp.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {camp.status}
                  </span>
                  <span className="text-xs font-bold text-slate-400">P{camp.priority}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 mb-2">{camp.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  {camp.description || 'Targeted outbound telecalling outreach.'}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Target Quota</span>
                    <span className="font-bold text-slate-200">{camp.target_calls} calls</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total Leads In Queue</span>
                    <span className="font-bold text-indigo-400">{camp.total_contacts} leads</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
                Created {new Date(camp.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="font-bold text-slate-100 text-lg">Launch New Campaign</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q4 Inbound Leads Renewal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Campaign pitch, qualification criteria, script notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Target Calls</label>
                  <input
                    type="number"
                    value={targetCalls}
                    onChange={(e) => setTargetCalls(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="1">1 - Standard</option>
                    <option value="2">2 - High Priority</option>
                    <option value="3">3 - Urgent Blitz</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
