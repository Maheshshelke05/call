'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import { UserCheck, Users, Check, AlertCircle } from 'lucide-react';

export default function AssignmentsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedCampId, setSelectedCampId] = useState<string>('');
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [empData, campData, contactData] = await Promise.all([
        AdminApi.getEmployees(),
        AdminApi.getCampaigns(),
        AdminApi.getContacts('', undefined, 100),
      ]);
      setEmployees(empData.filter((e: any) => e.is_active));
      setCampaigns(campData);
      setContacts(contactData);
      if (empData.length > 0 && !selectedEmpId) {
        setSelectedEmpId(empData[0].id.toString());
      }
      if (campData.length > 0 && !selectedCampId) {
        setSelectedCampId(campData[0].id.toString());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleContact = (id: number) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedContactIds.length === contacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(contacts.map((c) => c.id));
    }
  };

  const handleAssign = async () => {
    if (!selectedEmpId || selectedContactIds.length === 0) {
      alert('Please select an employee and at least one contact.');
      return;
    }

    setAssigning(true);
    setSuccessMsg('');
    try {
      const res = await AdminApi.assignContacts(
        parseInt(selectedEmpId, 10),
        selectedContactIds,
        selectedCampId ? parseInt(selectedCampId, 10) : undefined
      );
      setSuccessMsg(res.message);
      setSelectedContactIds([]);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div>
      <Header
        title="Contact Queue Assignment & Reallocation"
        subtitle="Distribute verified customer leads to specific calling agents and campaigns"
      />

      <div className="p-8 space-y-6">
        {successMsg ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>{successMsg}</span>
          </div>
        ) : null}

        {/* Assignment Controls Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Assign to Calling Agent
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-medium focus:outline-none focus:border-blue-500 min-w-[200px]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Target Campaign
              </label>
              <select
                value={selectedCampId}
                onChange={(e) => setSelectedCampId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-medium focus:outline-none focus:border-blue-500 min-w-[200px]"
              >
                <option value="">None (Standard Outbound)</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleAssign}
            disabled={assigning || selectedContactIds.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4" />
            <span>Assign {selectedContactIds.length} Selected Leads</span>
          </button>
        </div>

        {/* Contacts Selection Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Available Contacts for Assignment
            </span>
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              {selectedContactIds.length === contacts.length ? 'Deselect All' : 'Select All Leads'}
            </button>
          </div>

          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/40 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3 w-12"></th>
                <th className="px-6 py-3">Customer Name</th>
                <th className="px-6 py-3">Normalized Phone</th>
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {contacts.map((c) => {
                const isChecked = selectedContactIds.includes(c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => handleToggleContact(c.id)}
                    className={`cursor-pointer transition-colors ${
                      isChecked ? 'bg-blue-600/10' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                      />
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-100">
                      {c.first_name} {c.last_name || ''}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-blue-400 font-semibold">
                      {c.normalized_phone}
                    </td>
                    <td className="px-6 py-3.5 text-slate-300">{c.company || '—'}</td>
                    <td className="px-6 py-3.5">
                      <span className="text-xs font-bold text-slate-400">P{c.priority}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
