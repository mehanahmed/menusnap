"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Crown,
  Sparkles,
  Phone,
  MessageCircle,
  ExternalLink,
  CreditCard,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { Card, CardContent } from '@/components/ui/card';
import { useClientAuth } from '@/hooks/use-client-auth';
import { getCrmCustomersAction } from '@/app/actions/crm';
import { IssueCardModal } from '@/components/crm/IssueCardModal';
import { DigitalMembershipCard } from '@/components/crm/DigitalMembershipCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function CrmCustomersPage() {
  const { clientUser } = useClientAuth();
  const businessId = clientUser?.id || clientUser?.businessName || '';
  const businessName = clientUser?.businessName || 'Business';
  const businessType = clientUser?.type || 'restaurant';

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    totalOrders: 0,
    activeCustomers: 0,
    totalMembers: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent' | 'name'>('recent');

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedCustomerForCard, setSelectedCustomerForCard] = useState<any | null>(null);

  // Digital Card View Modal
  const [viewingCard, setViewingCard] = useState<any | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const res = await getCrmCustomersAction(businessId, {
        search,
        tier: tierFilter,
        sortBy,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res.success && res.customers) {
        setCustomers(res.customers);
        if (res.pagination) setPagination(res.pagination);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, search, tierFilter, sortBy, pagination.page, pagination.limit]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            Customer Relationship Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track customer order frequencies, lifetime value (LTV), and loyalty membership tiers.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedCustomerForCard(null);
            setIsIssueModalOpen(true);
          }}
          className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm h-10 px-4 self-start sm:self-auto"
        >
          <Crown className="w-4 h-4 mr-1.5" />
          Issue Membership Card
        </Button>
      </div>

      {/* 2. Top KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-3xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Customers
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-foreground font-mono">
                {kpis.totalCustomers.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Spent (LTV)
              </span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                ৳{kpis.totalRevenue.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Orders Placed
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-foreground font-mono">
                {kpis.totalOrders.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                VIP Card Holders
              </span>
              <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">
                {kpis.totalMembers.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white dark:bg-card p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-border/60 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by customer name, phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-2xl text-xs bg-slate-50/70 dark:bg-muted/30 border-slate-200/80"
          />
        </div>

        {/* Filters */}
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

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-44 h-10 rounded-2xl text-xs bg-slate-50/70 dark:bg-muted/30 border-slate-200/80">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="recent" className="text-xs">Latest Orders (Recent)</SelectItem>
              <SelectItem value="spent" className="text-xs">Top Spenders (LTV)</SelectItem>
              <SelectItem value="orders" className="text-xs">Most Orders</SelectItem>
              <SelectItem value="name" className="text-xs">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Customer Directory Table & Mobile Cards */}
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
                  <Skeleton className="h-3.5 w-28 rounded-md bg-slate-200/80 dark:bg-muted" />
                  <Skeleton className="h-5 w-16 rounded-full bg-slate-200/80 dark:bg-muted" />
                </div>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-10 h-10 rounded-full bg-slate-200/80 dark:bg-muted" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32 rounded-md bg-slate-200/80 dark:bg-muted" />
                    <Skeleton className="h-3 w-24 rounded-md bg-slate-100 dark:bg-muted/60" />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-muted/30 grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-20 rounded-md bg-slate-200/70 dark:bg-muted" />
                  <Skeleton className="h-4 w-24 rounded-md bg-slate-200/70 dark:bg-muted ml-auto" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 flex-1 rounded-xl bg-slate-200/70 dark:bg-muted" />
                  <Skeleton className="h-9 flex-1 rounded-xl bg-slate-900/40" />
                </div>
              </div>
            ))
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No customers found matching your search.
            </div>
          ) : (
            customers.map((c) => {
              const initials = c.name.slice(0, 2).toUpperCase();
              const cleanPhone = (c.phone || '').replace(/\D/g, '');

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border/60 shadow-xs space-y-3"
                >
                  {/* Top Row: Last Order Date & Tier Badge */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {c.last_order_date ? `Last: ${c.last_order_date}` : 'No orders yet'}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        c.tier === 'Gold'
                          ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          : c.tier === 'Platinum'
                            ? 'bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800'
                            : c.tier === 'VIP'
                              ? 'bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-muted dark:text-slate-300'
                      )}
                    >
                      {c.tier || 'Regular'}
                    </Badge>
                  </div>

                  {/* Middle Row: Customer Avatar + Name + Phone + WhatsApp Link */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center uppercase shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/crm/customers/${c.id}`}
                          className="font-bold text-sm text-slate-900 dark:text-foreground hover:text-amber-600 transition-colors block truncate"
                        >
                          {c.name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.phone}</span>
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

                    {/* Membership Card status */}
                    {c.card_number ? (
                      <button
                        type="button"
                        onClick={() =>
                          setViewingCard({
                            customerName: c.name,
                            customerPhone: c.phone,
                            cardNumber: c.card_number,
                            tier: c.card_tier || 'Gold',
                            discountPercent: Number(c.card_discount || 10),
                            issuedAt: c.card_issued_at || c.first_order_date || '2026-11-18',
                            expiresAt: c.card_expires_at || null,
                            customNote: c.card_custom_note,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 shrink-0 hover:scale-105 transition-transform"
                      >
                        <Crown className="w-3 h-3 text-amber-600" />
                        <span>{c.card_tier} ({c.card_discount}%)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerForCard(c);
                          setIsIssueModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-amber-600 hover:underline shrink-0 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200/60"
                      >
                        + Issue Card
                      </button>
                    )}
                  </div>

                  {/* Inner Details Box (Matching HRM Reference) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Orders</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-foreground">
                        {c.total_orders} Orders
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spent (LTV)</span>
                      <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                        ৳{Number(c.total_spent || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-0.5">
                    {c.card_number && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setViewingCard({
                            customerName: c.name,
                            customerPhone: c.phone,
                            cardNumber: c.card_number,
                            tier: c.card_tier || 'Gold',
                            discountPercent: Number(c.card_discount || 10),
                            issuedAt: c.card_issued_at || c.first_order_date || '2026-11-18',
                            expiresAt: c.card_expires_at || null,
                            customNote: c.card_custom_note,
                          })
                        }
                        className="flex-1 rounded-xl text-xs font-bold h-9 border-amber-200 text-amber-950 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        <Crown className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        View Card
                      </Button>
                    )}
                    <Button
                      asChild
                      size="sm"
                      className="flex-1 rounded-xl text-xs font-bold h-9 bg-slate-900 hover:bg-slate-800 text-white dark:bg-primary dark:text-primary-foreground shadow-xs"
                    >
                      <Link href={`/crm/customers/${c.id}`}>
                        Profile &amp; Orders &rarr;
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
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Customer</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Membership Status</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground text-center">Orders</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Total Spent (LTV)</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Last Order</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="border-b border-slate-100 dark:border-border/40">
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full bg-slate-200/80 dark:bg-muted" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32 rounded-md bg-slate-200/80 dark:bg-muted" />
                          <Skeleton className="h-3 w-24 rounded-md bg-slate-100 dark:bg-muted/60" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-28 rounded-xl bg-slate-200/70 dark:bg-muted/50" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8 rounded-md bg-slate-200/70 dark:bg-muted/50" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 rounded-md bg-slate-200/80 dark:bg-muted" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3.5 w-24 rounded-md bg-slate-100 dark:bg-muted/60" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-28 rounded-md ml-auto bg-slate-200/70 dark:bg-muted/50" />
                    </TableCell>
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-slate-400 text-xs">
                    No customers found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => {
                  const initials = c.name.slice(0, 2).toUpperCase();
                  const cleanPhone = (c.phone || '').replace(/\D/g, '');

                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-muted/40 transition-colors">
                      {/* Customer Name & Phone */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center uppercase shrink-0">
                            {initials}
                          </div>
                          <div>
                            <Link
                              href={`/crm/customers/${c.id}`}
                              className="font-bold text-sm text-slate-900 dark:text-foreground hover:text-amber-600 transition-colors block"
                            >
                              {c.name}
                            </Link>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{c.phone}</span>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 ml-1"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 inline" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Membership Card */}
                      <TableCell>
                        {c.card_number ? (
                          <button
                            type="button"
                            onClick={() =>
                              setViewingCard({
                                customerName: c.name,
                                customerPhone: c.phone,
                                cardNumber: c.card_number,
                                tier: c.card_tier || 'Gold',
                                discountPercent: Number(c.card_discount || 10),
                                issuedAt: c.card_issued_at || c.first_order_date || '2026-11-18',
                                expiresAt: c.card_expires_at || null,
                                customNote: c.card_custom_note,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all hover:scale-105 bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                          >
                            <Crown className="w-3 h-3 text-amber-600" />
                            <span>{c.card_tier} ({c.card_discount}% off)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomerForCard(c);
                              setIsIssueModalOpen(true);
                            }}
                            className="text-[11px] font-medium text-slate-400 hover:text-amber-600 hover:underline"
                          >
                            + Issue Card
                          </button>
                        )}
                      </TableCell>

                      {/* Orders Count */}
                      <TableCell className="text-center font-mono font-bold text-xs text-slate-800 dark:text-foreground">
                        {c.total_orders}
                      </TableCell>

                      {/* Total Spent */}
                      <TableCell className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                        ৳{Number(c.total_spent || 0).toLocaleString()}
                      </TableCell>

                      {/* Last Visit / Order */}
                      <TableCell className="font-mono text-xs text-slate-500">
                        {c.last_order_date || '--'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-xs font-semibold h-8 px-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                          >
                            <Link href={`/crm/customers/${c.id}`}>
                              Profile &amp; Orders &rarr;
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-border/60 flex items-center justify-between text-xs text-slate-500">
            <p>
              Showing {customers.length} of {pagination.total} customers
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1}
                className="rounded-xl text-xs h-8 px-2.5"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <span className="font-bold text-slate-800 dark:text-foreground">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-xl text-xs h-8 px-2.5"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Issue Membership Card Modal */}
      <IssueCardModal
        isOpen={isIssueModalOpen}
        onClose={() => {
          setIsIssueModalOpen(false);
          setSelectedCustomerForCard(null);
        }}
        businessId={businessId}
        initialCustomer={selectedCustomerForCard}
        customersList={customers}
        onSuccess={() => loadCustomers()}
      />

      {/* Visual Digital Membership Card Preview Modal */}
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
