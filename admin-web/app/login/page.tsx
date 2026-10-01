'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminApi } from '@/lib/api';
import { ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@callingplatform.local');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await AdminApi.login(email.trim(), password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md">
        {/* Logo Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-2xl shadow-xl shadow-blue-500/30 mb-4">
            C
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">CallSync CRM Portal</h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise Telephony & CRM Control Center</p>
        </div>


        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@company.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs text-center text-slate-500 font-medium mb-3 uppercase tracking-wider">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickFill('admin@callingplatform.local', 'Admin@123456')}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => quickFill('teamlead@callingplatform.local', 'Lead@123456')}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Team Lead
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
