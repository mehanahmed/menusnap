import type { ReactNode } from 'react';
import { AccountsGate } from '@/components/accounts/AccountsGate';
import { AccountsTopNavbar } from '@/components/accounts/AccountsTopNavbar';

export default function AccountsLayout({ children }: { children: ReactNode }) {
  return (
    <AccountsGate>
      <div className="flex flex-col min-h-screen bg-background w-full min-w-0 max-w-full print:min-h-0 print:h-auto print:block print:w-full print:p-0 print:m-0">
        <AccountsTopNavbar />
        <div className="flex-1 min-w-0 max-w-full print:min-h-0 print:h-auto print:block print:w-full print:p-0 print:m-0">
          {children}
        </div>
      </div>
    </AccountsGate>
  );
}
