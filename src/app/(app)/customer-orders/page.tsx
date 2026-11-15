"use client";

import { useClientAuth } from '@/hooks/use-client-auth';
import { usePreferences } from '@/context/PreferencesContext';
import { CustomerOrdersTable } from '@/components/menu/customer-orders-table';
import { UtensilsCrossed, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const HEADER_I18N = {
  restaurantTitle: {
    en: 'Customer QR Orders',
    bn: 'কাস্টমার কিউআর অর্ডার',
    ar: 'طلبات رمز QR للعملاء',
    es: 'Pedidos QR de Clientes',
  },
  parlourTitle: {
    en: 'Customer Service Orders',
    bn: 'কাস্টমার সার্ভিস অর্ডার',
    ar: 'طلبات خدمات العملاء',
    es: 'Pedidos de Servicios de Clientes',
  },
  liveSync: {
    en: 'Live Sync',
    bn: 'লাইভ সিঙ্ক',
    ar: 'مزامنة مباشرة',
    es: 'Sincronización en vivo',
  },
  restaurantSubtitle: {
    en: 'Real-time orders received from your digital QR menu stands and table scans.',
    bn: 'ডিজিটাল কিউআর মেনু স্ট্যান্ড ও টেবিল স্ক্যান থেকে আসা রিয়েল-টাইম অর্ডারসমূহ।',
    ar: 'طلبات فورية ومباشرة مستلمة من بطاقات وقوائم رمز QR الرقمية.',
    es: 'Pedidos en tiempo real recibidos desde sus soportes de menú QR y escaneos de mesa.',
  },
  parlourSubtitle: {
    en: 'Real-time service orders and bookings received from your digital QR cards.',
    bn: 'ডিজিটাল কিউআর কার্ড থেকে আসা রিয়েল-টাইম সার্ভিস বুকিং ও অর্ডারসমূহ।',
    ar: 'طلبات وحجوزات الخدمات المباشرة المستلمة من بطاقات QR الرقمية.',
    es: 'Pedidos y reservas de servicios en tiempo real recibidos desde sus tarjetas QR digitales.',
  },
};

export default function CustomerOrdersPage() {
  const { clientUser } = useClientAuth();
  const { currencySymbol, language } = usePreferences();
  const isParlour = clientUser?.type === 'parlour';
  const langKey = (language || 'en') as 'en' | 'bn' | 'ar' | 'es';

  const headerTitle = isParlour
    ? (HEADER_I18N.parlourTitle[langKey] || HEADER_I18N.parlourTitle.en)
    : (HEADER_I18N.restaurantTitle[langKey] || HEADER_I18N.restaurantTitle.en);
  const liveSyncText = HEADER_I18N.liveSync[langKey] || HEADER_I18N.liveSync.en;
  const headerSubtitle = isParlour
    ? (HEADER_I18N.parlourSubtitle[langKey] || HEADER_I18N.parlourSubtitle.en)
    : (HEADER_I18N.restaurantSubtitle[langKey] || HEADER_I18N.restaurantSubtitle.en);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden p-2 sm:p-3 lg:p-4 space-y-3 sm:space-y-4 pb-40 md:pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
            isParlour
              ? "bg-pink-500/10 border-pink-500/20 text-pink-600 dark:text-pink-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          )}>
            {isParlour ? <Sparkles className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                {headerTitle}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {liveSyncText}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate sm:whitespace-normal">
              {headerSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Orders Table */}
      <CustomerOrdersTable
        clientId={clientUser?.id}
        businessName={clientUser?.businessName}
        currencySymbol={currencySymbol}
        isParlour={isParlour}
      />
    </div>
  );
}

