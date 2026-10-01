import React from 'react';
import './globals.css';

export const metadata = {
  title: 'CallSync CRM — Enterprise Calling & Admin Portal',
  description: 'Production-grade Telephony & Employee Calling Operations Platform',
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 flex h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
