'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import { Building2, Plus, Users, X } from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await AdminApi.getTeams();
      setTeams(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await AdminApi.createTeam({ name, description });
      setShowModal(false);
      setName('');
      setDescription('');
      loadTeams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create team');
    }
  };

  return (
    <div>
      <Header
        title="Calling Teams & Departments"
        subtitle="Organize calling agents into functional regional and campaign squads"
        actionButton={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        }
      />

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {team.member_count} Members
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 mb-1">{team.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  {team.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
                Created {new Date(team.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Team Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="font-bold text-slate-100 text-lg">Create New Calling Team</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. South Region Telecallers"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Focus areas, goals, and responsibilities..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
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
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
