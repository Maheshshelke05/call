'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import { UserPlus, SimCard, Shield, Check, X, Search } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Employee@123456');
  const [role, setRole] = useState('EMPLOYEE');
  const [teamId, setTeamId] = useState<string>('');
  const [preferredSim, setPreferredSim] = useState('0');
  const [dailyTarget, setDailyTarget] = useState('50');

  const loadData = async () => {
    setLoading(true);
    try {
      const [empData, teamData] = await Promise.all([
        AdminApi.getEmployees(),
        AdminApi.getTeams(),
      ]);
      setEmployees(empData);
      setTeams(teamData);
      if (teamData.length > 0 && !teamId) {
        setTeamId(teamData[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await AdminApi.createEmployee({
        full_name: fullName,
        email,
        password,
        role,
        team_id: teamId ? parseInt(teamId, 10) : null,
        preferred_sim_slot: parseInt(preferredSim, 10),
        daily_call_target: parseInt(dailyTarget, 10),
      });
      setShowModal(false);
      setFullName('');
      setEmail('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create employee');
    }
  };

  const toggleActive = async (emp: any) => {
    try {
      await AdminApi.updateEmployee(emp.id, { is_active: !emp.is_active });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update employee status');
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Employee & Agent Management"
        subtitle="Provision employee accounts, assign teams, configure preferred SIMs and daily targets"
        actionButton={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        }
      />

      <div className="p-8 space-y-6">
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name or email..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredEmployees.length} of {employees.length} agents
          </span>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Team</th>
                <th className="px-6 py-4">Preferred SIM</th>
                <th className="px-6 py-4">Daily Target</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No employees matching search.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const teamName = teams.find((t) => t.id === emp.team_id)?.name || 'Unassigned';

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-100">{emp.full_name}</div>
                        <div className="text-xs text-slate-500">{emp.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{teamName}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
                          SIM {emp.preferred_sim_slot + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {emp.daily_call_target} calls
                      </td>
                      <td className="px-6 py-4">
                        {emp.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleActive(emp)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            emp.is_active
                              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                          }`}
                        >
                          {emp.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Employee */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="font-bold text-slate-100 text-lg">Provision New Employee</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="EMPLOYEE">Employee (Dialer)</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Assigned Team</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None (General Pool)</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Preferred SIM</label>
                  <select
                    value={preferredSim}
                    onChange={(e) => setPreferredSim(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="0">SIM 1 (Default Work)</option>
                    <option value="1">SIM 2 (Secondary)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Daily Target</label>
                  <input
                    type="number"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Temporary Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
