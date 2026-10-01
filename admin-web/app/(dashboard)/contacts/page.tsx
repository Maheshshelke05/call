'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import { Search, UserPlus, Phone, MapPin, Building, X, Tag } from 'lucide-react';
import Link from 'next/link';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<number | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('1');
  const [tags, setTags] = useState('Lead');

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await AdminApi.getContacts(search, priorityFilter);
      setContacts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, priorityFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await AdminApi.createContact({
        first_name: firstName,
        last_name: lastName,
        phone,
        company,
        location,
        priority: parseInt(priority, 10),
        tags,
      });
      setShowModal(false);
      setFirstName('');
      setLastName('');
      setPhone('');
      setCompany('');
      loadContacts();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create contact');
    }
  };

  return (
    <div>
      <Header
        title="Contacts & Lead Repository"
        subtitle="Normalized customer database with duplicate detection & priority ranking"
        actionButton={
          <div className="flex items-center gap-3">
            <Link
              href="/contacts/import"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Import CSV/Excel
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>New Contact</span>
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, normalized phone, or company..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Priority:</span>
            {[
              { label: 'All', val: undefined },
              { label: 'High', val: 3 },
              { label: 'Med', val: 2 },
              { label: 'Normal', val: 1 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setPriorityFilter(p.val)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  priorityFilter === p.val
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Normalized Phone</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-100">
                      {c.first_name} {c.last_name || ''}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-blue-400 font-semibold">
                      {c.normalized_phone}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{c.company || '—'}</td>
                    <td className="px-6 py-4 text-slate-400">{c.location || '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          c.priority === 3
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : c.priority === 2
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {c.priority === 3 ? 'High' : c.priority === 2 ? 'Medium' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {c.tags ? (
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                          {c.tags}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {c.is_do_not_call ? (
                        <span className="text-rose-400 text-xs font-semibold">DNC</span>
                      ) : (
                        <span className="text-emerald-400 text-xs font-semibold">Callable</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Contact */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="font-bold text-slate-100 text-lg">Add New Customer Contact</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Vikram"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Malhotra"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Mobile Number (India) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210 or +919876543210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Tata Motors"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">City / Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="1">1 - Normal</option>
                    <option value="2">2 - Medium</option>
                    <option value="3">3 - High Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. Enterprise, Lead"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
