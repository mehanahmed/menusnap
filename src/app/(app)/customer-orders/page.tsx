"use client";

import { useClientAuth } from '@/hooks/use-client-auth';
import { usePreferences } from '@/context/PreferencesContext';
import { CustomerOrdersTable } from '@/components/menu/customer-orders-table';
import { UtensilsCrossed } from 'lucide-react';

export default function CustomerOrdersPage() {
  const { clientUser } = useClientAuth();
  const { currencySymbol } = usePreferences();

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden p-2 sm:p-3 lg:p-4 space-y-3 sm:space-y-4 pb-40 md:pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                Customer QR Orders
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate sm:whitespace-normal">
              Real-time orders received from your digital QR menu stands and table scans.
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Orders Table */}
      <CustomerOrdersTable
        clientId={clientUser?.id}
        businessName={clientUser?.businessName}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}

