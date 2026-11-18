"use client";

import React from 'react';
import { CrmTopNavbar } from '@/components/crm/CrmTopNavbar';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full sm:min-h-screen bg-slate-50/50 dark:bg-background flex flex-col w-full min-w-0 max-w-full">
      <CrmTopNavbar />
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
        {children}
      </main>
    </div>
  );
}
