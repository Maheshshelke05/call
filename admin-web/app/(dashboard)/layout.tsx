'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { AdminApi } from '@/lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = AdminApi.getCurrentUser();
    if (!user) {
      router.push('/login');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Verifying corporate credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-950">
        {children}
      </main>
    </div>
  );
}
