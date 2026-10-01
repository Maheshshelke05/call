'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import { Mic, Play, Download, Pause, ShieldAlert, Volume2, X } from 'lucide-react';

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlayback, setActivePlayback] = useState<any>(null);
  const [playingUrl, setPlayingUrl] = useState<string>('');

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const data = await AdminApi.getRecordings();
      setRecordings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  const handlePlay = async (rec: any) => {
    try {
      const res = await AdminApi.getPlaybackUrl(rec.id, 'PLAY');
      setActivePlayback(rec);
      setPlayingUrl(res.playback_url);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate playback URL');
    }
  };

  const handleDownload = async (rec: any) => {
    try {
      const res = await AdminApi.getPlaybackUrl(rec.id, 'DOWNLOAD');
      window.open(res.playback_url, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Download restricted');
    }
  };

  return (
    <div>
      <Header
        title="Encrypted Call Recordings"
        subtitle="Role-based private S3 recordings with short-lived presigned URLs and immutable access logs"
      />

      <div className="p-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Customer & Lead</th>
                <th className="px-6 py-4">Agent</th>
                <th className="px-6 py-4">Call Date</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Disposition</th>
                <th className="px-6 py-4">Storage State</th>
                <th className="px-6 py-4 text-right">Secure Audio Player</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading recordings catalog...
                  </td>
                </tr>
              ) : recordings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No recordings stored yet. Completed calls with audio capture will appear here.
                  </td>
                </tr>
              ) : (
                recordings.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-100">{rec.contact_name}</div>
                      <div className="text-xs font-mono text-blue-400">{rec.contact_phone}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">{rec.employee_name}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(rec.call_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-200">{rec.duration_seconds}s</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {rec.disposition_label || 'COMPLETED'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Private S3 AES-256
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePlay(rec)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/30"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Play</span>
                        </button>
                        <button
                          onClick={() => handleDownload(rec)}
                          title="Authorized Download"
                          className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Audio Player Bar */}
      {playingUrl && activePlayback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl shadow-black/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">
                {activePlayback.contact_name} ({activePlayback.duration_seconds}s)
              </p>
              <p className="text-xs text-slate-400">Agent: {activePlayback.employee_name}</p>
            </div>
          </div>

          <div className="flex-1 max-w-xs">
            <audio src={playingUrl} controls autoPlay className="w-full h-8" />
          </div>

          <button
            onClick={() => {
              setPlayingUrl('');
              setActivePlayback(null);
            }}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
