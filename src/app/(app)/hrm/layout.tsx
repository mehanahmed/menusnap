"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { HrmTopNavbar } from '@/components/hrm/HrmTopNavbar';

export default function HrmLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isKiosk = pathname === '/hrm/kiosk' || pathname.startsWith('/hrm/kiosk/');
  const isPunch = pathname === '/hrm/punch' || pathname.startsWith('/hrm/punch/');

  if (isKiosk || isPunch) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-background w-full min-w-0 max-w-full print:min-h-0 print:h-auto print:block print:w-full print:p-0 print:m-0">
      <HrmTopNavbar />
      <main className="flex-1 min-w-0 max-w-full">
        {children}
      </main>
    </div>
  );
}
