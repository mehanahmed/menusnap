'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useClientAuth } from '@/hooks/use-client-auth';
import { usePreferences } from '@/context/PreferencesContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Sparkles, ArrowRight, ShieldCheck, Wallet, Receipt, Users, Truck } from 'lucide-react';

interface AccountsGateProps {
  children: ReactNode;
}

export function AccountsGate({ children }: AccountsGateProps) {
  const { clientUser, clientLoading, isSubscriber, currentPackage, isAdmin } = useClientAuth();
  const { t } = usePreferences();
  const router = useRouter();

  const isProUser = useMemo(() => {
    if (isAdmin) return true;
    if (isSubscriber) return true;
    const pkg = (currentPackage || clientUser?.subscriptionPackage || '').toLowerCase();
    if (pkg.includes('pro') || pkg.includes('agency') || pkg.includes('enterprise') || pkg.includes('lifetime') || pkg.includes('premium')) return true;
    return Boolean(clientUser?.isSubscriber);
  }, [isAdmin, isSubscriber, currentPackage, clientUser]);

  if (clientLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isProUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-xl w-full border border-border/60 bg-card rounded-3xl shadow-xl overflow-hidden text-center p-6 sm:p-10 relative">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-[#FF5A36]/15 via-orange-500/10 to-amber-500/15 border border-orange-500/20 text-[#FF5A36] mb-4 shadow-sm">
            <Crown className="w-8 h-8 text-[#FF5A36]" />
          </div>

          <Badge className="mx-auto mb-3 bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-bold py-1 px-3 rounded-full text-xs tracking-wider border-none shadow-md shadow-orange-500/20">
            PRO EXCLUSIVE
          </Badge>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-2">
            {t('accountsProRequired', 'Accounts Module Requires Pro Plan')}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
            {clientUser?.type === 'parlour'
              ? 'Track daily parlour expenses, manage vendor ledger balances, manage staff records, and control salon finances effortlessly.'
              : 'Track daily restaurant expenses, manage vendor ledger balances, manage staff records, and control business finances effortlessly.'}
          </p>

          <div className="grid grid-cols-2 gap-3 text-left mb-8 max-w-md mx-auto">
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-foreground">Expense Tracker</span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Truck className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-foreground">Vendor Ledger</span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-foreground">Staff Records</span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-foreground">Financial Reports</span>
            </div>
          </div>

          <Button
            onClick={() => router.push('/checkout?plan=pro')}
            className="w-full sm:w-auto px-8 h-12 bg-gradient-to-r from-[#FF5A36] to-[#ff7b4b] hover:from-[#e64c29] hover:to-[#f06e3e] text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mx-auto transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('upgradeToPro', 'Upgrade to Pro to Access')}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
