'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { AdminApi } from '@/lib/api';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ContactImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [importSummary, setImportSummary] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setLoading(true);
    setPreview(null);
    setImportSummary(null);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const data = await AdminApi.previewImport(formData);
      setPreview(data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to parse CSV preview');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await AdminApi.confirmImport(formData);
      setImportSummary(res);
      setPreview(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to process import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Batch Lead & Contact Importer"
        subtitle="Upload CSV files with automatic Indian phone normalization & duplicate suppression"
        actionButton={
          <Link
            href="/contacts"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            ← Back to Contacts
          </Link>
        }
      />

      <div className="p-8 max-w-5xl space-y-8">
        {/* Upload Dropzone */}
        {!preview && !importSummary && (
          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-12 text-center bg-slate-900/60 backdrop-blur transition-all">
            <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-100 mb-2">Upload CSV or XLSX File</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              File must contain columns: <span className="text-slate-200 font-mono">name, phone, company, location</span>.
              Indian phone numbers will be automatically formatted to E.164 (+91).
            </p>

            <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl cursor-pointer shadow-lg shadow-blue-600/30 transition-all">
              <span>Choose File</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
            </label>

            {loading && <p className="text-xs text-slate-400 mt-4 animate-pulse">Parsing rows and checking duplicates...</p>}
          </div>
        )}

        {/* Preview Summary */}
        {preview && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Import Verification Preview</h3>
                  <p className="text-xs text-slate-400">File: {preview.file_name}</p>
                </div>
                <button
                  onClick={handleConfirmImport}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  <span>Confirm & Commit Import</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Total Rows</span>
                  <p className="text-2xl font-extrabold text-slate-100 mt-1">{preview.total_rows}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-emerald-500 font-semibold uppercase">Valid Leads</span>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">{preview.valid_rows}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-amber-500 font-semibold uppercase">Duplicates</span>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1">{preview.duplicate_rows}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-rose-500 font-semibold uppercase">Invalid Phone</span>
                  <p className="text-2xl font-extrabold text-rose-400 mt-1">{preview.invalid_rows}</p>
                </div>
              </div>

              {/* Preview Rows Table */}
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Raw Phone</th>
                      <th className="px-4 py-3">Normalized (+91)</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {preview.preview_rows.map((row: any) => (
                      <tr key={row.row_number} className="hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 font-mono text-slate-500">#{row.row_number}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-200">{row.name}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{row.raw_phone}</td>
                        <td className="px-4 py-2.5 font-mono text-blue-400 font-semibold">
                          {row.normalized_phone || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.status === 'VALID'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : row.status === 'DUPLICATE'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Success Final Summary */}
        {importSummary && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-bold text-slate-100">Batch Import Successfully Executed!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Added {importSummary.inserted} new contacts to the repository. Suppressed {importSummary.duplicate} existing duplicates.
            </p>

            <div className="flex justify-center gap-4 pt-4">
              <Link
                href="/contacts"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30"
              >
                View Repository
              </Link>
              <Link
                href="/assignments"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700"
              >
                Assign Leads to Agents →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
