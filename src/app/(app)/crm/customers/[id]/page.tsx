"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  ChevronLeft,
  Crown,
  Phone,
  MessageCircle,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Clock,
  Sparkles,
  UtensilsCrossed,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useClientAuth } from '@/hooks/use-client-auth';
import { getCustomerDetailsAction } from '@/app/actions/crm';
import { DigitalMembershipCard } from '@/components/crm/DigitalMembershipCard';
import { IssueCardModal } from '@/components/crm/IssueCardModal';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const customerId = Number(resolvedParams.id);
  const router = useRouter();

  const { clientUser } = useClientAuth();
  const businessId = clientUser?.id || clientUser?.businessName || '';
  const businessName = clientUser?.businessName || 'Business';
  const businessType = clientUser?.type || 'restaurant';

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any | null>(null);
  const [activeCard, setActiveCard] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  // Modals
  const [isViewCardOpen, setIsViewCardOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  const loadDetails = async () => {
    if (!businessId || !customerId) return;
    try {
      setLoading(true);
      const res = await getCustomerDetailsAction(businessId, customerId);
      if (res.success && res.customer) {
        setCustomer(res.customer);
        setActiveCard(res.activeCard || null);
        setOrders(res.orders || []);
      }
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [businessId, customerId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-200">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40 rounded-md bg-slate-200/80 dark:bg-muted" />
          <Skeleton className="h-10 w-44 rounded-2xl bg-amber-500/30" />
        </div>

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-44 md:col-span-2 rounded-3xl bg-slate-100 dark:bg-muted/40" />
          <Skeleton className="h-44 rounded-3xl bg-slate-100 dark:bg-muted/40" />
          <Skeleton className="h-44 rounded-3xl bg-slate-100 dark:bg-muted/40" />
        </div>

        {/* Table Skeleton */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-border/60 p-6 bg-white dark:bg-card space-y-4">
          <Skeleton className="h-5 w-48 rounded-md bg-slate-200/80 dark:bg-muted" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl bg-slate-100 dark:bg-muted/40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm font-bold text-slate-800 dark:text-foreground">Customer not found</p>
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href="/crm/customers">Back to Customers</Link>
        </Button>
      </div>
    );
  }

  const cleanPhone = (customer.phone || '').replace(/\D/g, '');

  return (
    <div className="space-y-6">
      {/* 1. Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/crm/customers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Customer Directory
        </Link>

        {activeCard ? (
          <Button
            onClick={() => setIsViewCardOpen(true)}
            className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs h-9 px-4 shadow-sm"
          >
            <Crown className="w-4 h-4 mr-1.5" />
            View Digital Membership Card
          </Button>
        ) : (
          <Button
            onClick={() => setIsIssueModalOpen(true)}
            className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs h-9 px-4 shadow-sm"
          >
            <Crown className="w-4 h-4 mr-1.5" />
            Issue Membership Card
          </Button>
        )}
      </div>

      {/* 2. Customer Profile Hero & Spending KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Customer Info Card */}
        <div className="lg:col-span-5 bg-white dark:bg-card border border-slate-200/80 dark:border-border/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-2xl flex items-center justify-center uppercase shadow-md shrink-0">
              {customer.name.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-xl text-slate-900 dark:text-foreground leading-tight truncate">
                  {customer.name}
                </h2>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold rounded-md px-2 py-0.5 bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  {customer.tier} Customer
                </Badge>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <a
                  href={`tel:${customer.phone}`}
                  className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:text-blue-600"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {customer.phone}
                </a>

                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Membership Card Callout */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-transparent dark:from-amber-950/40 dark:to-transparent border border-amber-200/70 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                Loyalty Membership
              </span>
              {activeCard ? (
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">No Card</span>
              )}
            </div>

            {activeCard ? (
              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="font-mono font-black text-slate-900 dark:text-foreground text-sm block">
                    {activeCard.card_number}
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    {activeCard.tier} Tier • {activeCard.discount_percent}% OFF
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsViewCardOpen(true)}
                  className="h-8 rounded-xl text-xs font-bold border-amber-300 text-amber-900 dark:text-amber-200 bg-white dark:bg-card hover:bg-amber-50"
                >
                  View Card
                </Button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 pt-1 flex items-center justify-between">
                <span>Issue a card to offer loyalty discounts.</span>
                <Button
                  size="sm"
                  onClick={() => setIsIssueModalOpen(true)}
                  className="h-7 text-[11px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  Issue Card
                </Button>
              </div>
            )}
          </div>

          {/* Customer Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-border/60">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Customer Since</span>
              <span className="font-mono text-slate-800 dark:text-foreground font-medium">
                {customer.joined_date || customer.first_order_date || 'Recent'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Last Visit</span>
              <span className="font-mono text-slate-800 dark:text-foreground font-medium">
                {customer.last_order_date || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Key Spending Stats with Icon Chips & Activity Bar */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* LTV */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card p-4 sm:p-5 shadow-xs hover:border-emerald-300/60 dark:hover:border-emerald-700/60 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                  Total Spent (LTV)
                </span>
                <div className="w-8 h-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">
                  ৳{customer.total_spent.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  All Orders Combined
                </span>
              </div>
            </Card>

            {/* Total Orders */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card p-4 sm:p-5 shadow-xs hover:border-purple-300/60 dark:hover:border-purple-700/60 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                  Total Orders
                </span>
                <div className="w-8 h-8 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2.5">
                <span className="text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-400 font-mono tracking-tight">
                  {customer.total_orders}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                  Dining Frequency
                </span>
              </div>
            </Card>

            {/* AOV */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card p-4 sm:p-5 shadow-xs hover:border-blue-300/60 dark:hover:border-blue-700/60 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                  Avg Ticket (AOV)
                </span>
                <div className="w-8 h-8 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2.5">
                <span className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-400 font-mono tracking-tight">
                  ৳{customer.average_order_value.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                  Average Per Visit
                </span>
              </div>
            </Card>
          </div>

          {/* Quick Loyalty & Engagement Activity Insight Banner */}
          <div className="p-4 rounded-3xl bg-slate-50/90 dark:bg-muted/30 border border-slate-200/70 dark:border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-foreground">
                  {customer.total_orders >= 5
                    ? 'Loyal Regular Customer'
                    : customer.total_orders >= 2
                    ? 'Returning Diner'
                    : 'First-Time Customer'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-muted text-slate-700 dark:text-slate-300">
                  {orders.length > 0 && (orders[0].source === 'qr' || orders[0].source_label === 'QR Order')
                    ? 'QR Ordering'
                    : 'POS / Manual'}
                </span>
              </div>
            </div>

            {activeCard ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-3 py-1.5 rounded-2xl shrink-0">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>{activeCard.discount_percent}% Membership Discount</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsIssueModalOpen(true)}
                className="h-8 rounded-xl text-xs font-bold border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 shrink-0"
              >
                <Crown className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Issue Membership Card
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Complete Past Order History Table */}
      <div className="bg-white dark:bg-card rounded-3xl border border-slate-200/80 dark:border-border/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-border/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-foreground flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              Complete Past Order History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Full breakdown of items ordered and bills paid by this customer.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {orders.length} Records
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No past orders recorded yet for this customer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Order ID</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Date &amp; Time</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Table</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Items Ordered</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground text-right">Total Bill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((ord) => (
                  <TableRow key={ord.order_id} className="hover:bg-slate-50/60 dark:hover:bg-muted/40">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-foreground">
                          {ord.order_id}
                        </span>
                        <span className={`inline-flex items-center w-fit text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          ord.source === 'manual'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {ord.source_label || (ord.source === 'manual' ? 'Manual Order' : 'QR Order')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">
                      {ord.order_date}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {ord.table_number ? `Table ${ord.table_number}` : (ord.source === 'manual' ? 'Manual / POS' : 'Takeaway / QR')}
                    </TableCell>
                    <TableCell className="text-xs max-w-xs">
                      <div className="space-y-1">
                        {ord.items && ord.items.length > 0 ? (
                          ord.items.map((it: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-block bg-slate-100 dark:bg-muted px-2 py-0.5 rounded-md text-[11px] font-medium mr-1.5 mb-1 text-slate-700 dark:text-slate-200"
                            >
                              {it.quantity || 1}x {it.name || it.title || 'Item'}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Direct Order</span>
                        )}
                        {ord.special_note && (
                          <p className="text-[11px] text-slate-500 italic truncate max-w-[200px]" title={ord.special_note}>
                            {ord.special_note}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ord.status === 'completed' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          Completed
                        </Badge>
                      ) : ord.status === 'cancelled' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                          Cancelled
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                          {ord.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm text-slate-900 dark:text-foreground">
                      ৳{ord.total_amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Visual Digital Membership Card Dialog */}
      {activeCard && (
        <Dialog open={isViewCardOpen} onOpenChange={setIsViewCardOpen}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-slate-950 text-white border-slate-800 shadow-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                Customer Digital Membership Card
              </DialogTitle>
            </DialogHeader>

            <div className="py-2">
              <DigitalMembershipCard
                businessName={businessName}
                businessType={businessType}
                customerName={customer.name}
                customerPhone={customer.phone}
                cardNumber={activeCard.card_number}
                tier={activeCard.tier}
                discountPercent={activeCard.discount_percent}
                issuedAt={activeCard.issued_at}
                expiresAt={activeCard.expires_at}
                customNote={activeCard.card_custom_note}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Issue Card Modal */}
      <IssueCardModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        businessId={businessId}
        initialCustomer={customer}
        onSuccess={() => loadDetails()}
      />
    </div>
  );
}
