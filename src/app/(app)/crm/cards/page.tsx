"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Crown,
  Search,
  Sparkles,
  CreditCard,
  Phone,
  MessageCircle,
  Share2,
  Calendar,
  Eye,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { getCrmMembershipCardsAction, getCrmCustomersAction } from '@/app/actions/crm';
import { DigitalMembershipCard } from '@/components/crm/DigitalMembershipCard';
import { IssueCardModal } from '@/components/crm/IssueCardModal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function CrmMembershipCardsPage() {
  const { clientUser } = useClientAuth();
  const businessId = clientUser?.id || clientUser?.businessName || '';
  const businessName = clientUser?.businessName || 'Business';
  const businessType = clientUser?.type || 'restaurant';

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [viewingCard, setViewingCard] = useState<any | null>(null);

  const loadCards = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const res = await getCrmMembershipCardsAction(businessId, {
        search,
        tier: tierFilter,
        status: statusFilter,
      });

      if (res.success && res.cards) {
        setCards(res.cards);
      }
    } catch (err) {
      console.error('Failed to load membership cards:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, search, tierFilter, statusFilter]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Load customers list for modal dropdown
  useEffect(() => {
    if (businessId) {
      getCrmCustomersAction(businessId, { limit: 100 }).then((res) => {
        if (res.success && res.customers) {
          setCustomers(res.customers);
        }
      });
    }
  }, [businessId]);

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-foreground tracking-tight flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" />
            Digital Membership Cards
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Issue and manage branded luxury digital cards with QR codes and automatic discounts.
          </p>
        </div>

        <Button
          onClick={() => setIsIssueModalOpen(true)}
          className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm h-10 px-4 self-start sm:self-auto"
        >
          <Crown className="w-4 h-4 mr-1.5" />
          Issue New Card
        </Button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white dark:bg-card p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-border/60 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by customer name, phone, or card number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-2xl text-xs bg-slate-50/70 dark:bg-muted/30 border-slate-200/80"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-36 h-10 rounded-2xl text-xs bg-slate-50/70 dark:bg-muted/30 border-slate-200/80">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="text-xs">All Tiers</SelectItem>
              <SelectItem value="Silver" className="text-xs">Silver</SelectItem>
              <SelectItem value="Gold" className="text-xs">Gold</SelectItem>
              <SelectItem value="Platinum" className="text-xs">Platinum</SelectItem>
              <SelectItem value="VIP" className="text-xs">VIP</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-10 rounded-2xl text-xs bg-slate-50/70 dark:bg-muted/30 border-slate-200/80">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="expired" className="text-xs">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Cards Directory (Mobile Cards vs Desktop Table) */}
      <div className="bg-white dark:bg-card rounded-3xl border border-slate-200/80 dark:border-border/60 shadow-xs overflow-hidden">
        {/* Mobile View: Cards Layout (block md:hidden) */}
        <div className="block md:hidden p-3.5 space-y-3 bg-slate-50/50 dark:bg-muted/20">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border/60 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-28 rounded-xl bg-slate-200/80 dark:bg-muted" />
                  <Skeleton className="h-5 w-16 rounded-full bg-slate-200/80 dark:bg-muted" />
                </div>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-10 h-10 rounded-full bg-slate-200/80 dark:bg-muted" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32 rounded-md bg-slate-200/80 dark:bg-muted" />
                    <Skeleton className="h-3 w-24 rounded-md bg-slate-100 dark:bg-muted/60" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full bg-slate-200/70 dark:bg-muted" />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-muted/30 grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-20 rounded-md bg-slate-200/70 dark:bg-muted" />
                  <Skeleton className="h-4 w-20 rounded-md bg-slate-200/70 dark:bg-muted ml-auto" />
                </div>
                <Skeleton className="h-9 w-full rounded-xl bg-slate-200/70 dark:bg-muted" />
              </div>
            ))
          ) : cards.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No membership cards issued yet. Click &quot;Issue New Card&quot; to get started.
            </div>
          ) : (
            cards.map((c) => {
              const initials = (c.customer_name || 'MC').slice(0, 2).toUpperCase();
              const cleanPhone = (c.customer_phone || '').replace(/\D/g, '');

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border/60 shadow-xs space-y-3"
                >
                  {/* Top Row: Card Number & Status */}
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setViewingCard({
                          customerName: c.customer_name,
                          customerPhone: c.customer_phone,
                          cardNumber: c.card_number,
                          tier: c.tier,
                          discountPercent: Number(c.discount_percent),
                          issuedAt: c.issued_at,
                          expiresAt: c.expires_at,
                          customNote: c.card_custom_note,
                        })
                      }
                      className="font-mono font-black text-xs text-slate-900 dark:text-foreground hover:text-amber-600 bg-slate-100 dark:bg-muted/60 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-border transition-colors block text-left"
                    >
                      {c.card_number}
                    </button>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full capitalize',
                        c.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-muted dark:text-slate-400'
                      )}
                    >
                      {c.status}
                    </Badge>
                  </div>

                  {/* Middle Row: Cardholder Avatar + Name + Phone (Left) & Tier Badge (Right) */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border flex items-center justify-center font-bold text-xs text-slate-700 dark:text-foreground uppercase shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/crm/customers/${c.customer_id}`}
                          className="font-bold text-sm text-slate-900 dark:text-foreground hover:text-amber-600 transition-colors block truncate"
                        >
                          {c.customer_name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.customer_phone || 'No phone'}</span>
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 ml-1 shrink-0"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 inline" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tier Pill */}
                    <Badge
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-0.5 rounded-xl shrink-0',
                        c.tier === 'Gold'
                          ? 'bg-amber-500 text-white'
                          : c.tier === 'Platinum'
                            ? 'bg-cyan-700 text-white'
                            : c.tier === 'VIP'
                              ? 'bg-purple-900 text-white'
                              : 'bg-slate-700 text-white'
                      )}
                    >
                      {c.tier} ({Number(c.discount_percent)}%)
                    </Badge>
                  </div>

                  {/* Inner Details Box (Matching HRM Reference) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Issued Date</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-foreground">
                        {c.issued_at}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Valid Thru</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-foreground">
                        {c.expires_at ? c.expires_at : 'LIFETIME'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <Button
                      size="sm"
                      onClick={() =>
                        setViewingCard({
                          customerName: c.customer_name,
                          customerPhone: c.customer_phone,
                          cardNumber: c.card_number,
                          tier: c.tier,
                          discountPercent: Number(c.discount_percent),
                          issuedAt: c.issued_at,
                          expiresAt: c.expires_at,
                          customNote: c.card_custom_note,
                        })
                      }
                      className="flex-1 rounded-xl text-xs font-bold h-9 bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View Digital Card
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs font-semibold h-9 px-3 border-slate-200 dark:border-border"
                    >
                      <Link href={`/crm/customers/${c.customer_id}`}>
                        Profile &rarr;
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (hidden on mobile, block on md+) */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Card Number</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Cardholder</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Tier</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Discount Rate</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Issued Date</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Valid Thru</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground text-center">Status</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="border-b border-slate-100 dark:border-border/40">
                    <TableCell className="py-3.5">
                      <Skeleton className="h-6 w-28 rounded-xl bg-slate-200/80 dark:bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-32 rounded-md bg-slate-200/80 dark:bg-muted" />
                        <Skeleton className="h-3 w-24 rounded-md bg-slate-100 dark:bg-muted/60" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full bg-slate-200/70 dark:bg-muted/50" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12 rounded-md bg-slate-200/80 dark:bg-muted" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3.5 w-20 rounded-md bg-slate-100 dark:bg-muted/60" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3.5 w-20 rounded-md bg-slate-100 dark:bg-muted/60" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-5 w-14 rounded-full mx-auto bg-slate-200/70 dark:bg-muted/50" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-24 rounded-xl ml-auto bg-slate-200/70 dark:bg-muted/50" />
                    </TableCell>
                  </TableRow>
                ))
              ) : cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-slate-400 text-xs">
                    No membership cards issued yet. Click &quot;Issue New Card&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                cards.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-muted/40">
                    {/* Card Number */}
                    <TableCell>
                      <button
                        type="button"
                        onClick={() =>
                          setViewingCard({
                            customerName: c.customer_name,
                            customerPhone: c.customer_phone,
                            cardNumber: c.card_number,
                            tier: c.tier,
                            discountPercent: Number(c.discount_percent),
                            issuedAt: c.issued_at,
                            expiresAt: c.expires_at,
                            customNote: c.card_custom_note,
                          })
                        }
                        className="font-mono font-black text-xs text-slate-900 dark:text-foreground hover:text-amber-600 bg-slate-100 dark:bg-muted/60 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-border transition-colors block text-left"
                      >
                        {c.card_number}
                      </button>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <Link
                        href={`/crm/customers/${c.customer_id}`}
                        className="font-bold text-xs text-slate-900 dark:text-foreground hover:text-amber-600 transition-colors block"
                      >
                        {c.customer_name}
                      </Link>
                      <span className="font-mono text-[11px] text-slate-400 block">
                        {c.customer_phone}
                      </span>
                    </TableCell>

                    {/* Tier */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold rounded-md px-2 py-0.5 border ${c.tier === 'Gold'
                          ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200'
                          : c.tier === 'Platinum'
                            ? 'bg-cyan-50 text-cyan-900 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200'
                            : c.tier === 'VIP'
                              ? 'bg-purple-50 text-purple-900 border-purple-200 dark:bg-purple-950/40 dark:text-purple-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                      >
                        <Crown className="w-2.5 h-2.5 mr-1 inline" />
                        {c.tier}
                      </Badge>
                    </TableCell>

                    {/* Discount */}
                    <TableCell className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                      {c.discount_percent}% OFF
                    </TableCell>

                    {/* Issued Date */}
                    <TableCell className="font-mono text-xs text-slate-500">
                      {c.issued_at}
                    </TableCell>

                    {/* Valid Thru */}
                    <TableCell className="font-mono text-xs text-slate-500">
                      {c.expires_at || 'Lifetime'}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {c.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Expired
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setViewingCard({
                              customerName: c.customer_name,
                              customerPhone: c.customer_phone,
                              cardNumber: c.card_number,
                              tier: c.tier,
                              discountPercent: Number(c.discount_percent),
                              issuedAt: c.issued_at,
                              expiresAt: c.expires_at,
                              customNote: c.card_custom_note,
                            })
                          }
                          className="h-8 rounded-xl text-xs font-semibold px-2.5"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-amber-500" />
                          View Card
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Issue Modal */}
      <IssueCardModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        businessId={businessId}
        customersList={customers}
        onSuccess={() => loadCards()}
      />

      {/* Visual Digital Membership Card Dialog */}
      {viewingCard && (
        <Dialog open={Boolean(viewingCard)} onOpenChange={(open) => !open && setViewingCard(null)}>
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
                customerName={viewingCard.customerName}
                customerPhone={viewingCard.customerPhone}
                cardNumber={viewingCard.cardNumber}
                tier={viewingCard.tier}
                discountPercent={viewingCard.discountPercent}
                issuedAt={viewingCard.issuedAt}
                expiresAt={viewingCard.expiresAt}
                customNote={viewingCard.customNote}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
