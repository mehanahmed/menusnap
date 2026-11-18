"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Crown, Sparkles, CheckCircle2, Loader2, Search, X, Phone, User, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { issueMembershipCardAction, getCrmSettingsAction, getCrmCustomersAction } from '@/app/actions/crm';

interface CustomerOption {
  id: number;
  name: string;
  phone: string;
  card_tier?: string;
  tier?: string;
  total_spent?: number;
  total_orders?: number;
  [key: string]: any;
}

interface IssueCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string | number;
  initialCustomer?: CustomerOption | null;
  customersList?: CustomerOption[];
  onSuccess: () => void;
}

export function IssueCardModal({
  isOpen,
  onClose,
  businessId,
  initialCustomer,
  customersList = [],
  onSuccess,
}: IssueCardModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [serverCustomers, setServerCustomers] = useState<CustomerOption[]>([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [tier, setTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'VIP'>('Gold');
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [validityMonths, setValidityMonths] = useState<number>(12);
  const [crmSettings, setCrmSettings] = useState<any>(null);

  useEffect(() => {
    if (!businessId) return;
    getCrmSettingsAction(businessId).then((res) => {
      if (res.success && res.settings) {
        setCrmSettings(res.settings);
        if (res.settings.card_validity_months !== undefined) {
          setValidityMonths(Number(res.settings.card_validity_months));
        }
        if (res.settings.gold_discount !== undefined) {
          setDiscountPercent(Number(res.settings.gold_discount));
        }
      }
    });
  }, [businessId]);

  // Sync initialCustomer on open/change
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      setIsSearching(false);
      return;
    }

    if (initialCustomer) {
      setSelectedCustomer(initialCustomer);
      setSelectedCustomerId(String(initialCustomer.id));
      setIsSearching(false);
    } else {
      setSelectedCustomer(null);
      setSelectedCustomerId('');
      setIsSearching(true);
      setSearchQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen, initialCustomer]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch customers from server only when debounced query has text
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!isOpen || !businessId || !trimmed) {
      setIsSearchingServer(false);
      return;
    }

    let isMounted = true;
    setIsSearchingServer(true);

    getCrmCustomersAction(businessId, {
      search: trimmed,
      limit: 30,
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.customers) {
          setServerCustomers(res.customers);
        }
      })
      .catch((err) => {
        console.error('Customer search error:', err);
      })
      .finally(() => {
        if (isMounted) setIsSearchingServer(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, businessId, debouncedQuery]);

  // Combine and filter customers list - only when user typed something
  const filteredCustomers = useMemo(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      return [];
    }

    const map = new Map<number, CustomerOption>();
    customersList.forEach((c) => map.set(c.id, c));
    serverCustomers.forEach((c) => map.set(c.id, c));
    if (initialCustomer) map.set(initialCustomer.id, initialCustomer);
    const all = Array.from(map.values());

    const q = trimmed.toLowerCase();
    const qClean = q.replace(/\D/g, '');

    return all
      .filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(q);
        const phoneMatch =
          c.phone?.toLowerCase().includes(q) ||
          (qClean.length > 2 && c.phone?.replace(/\D/g, '').includes(qClean));
        return nameMatch || phoneMatch;
      })
      .slice(0, 30);
  }, [customersList, serverCustomers, initialCustomer, debouncedQuery]);

  const handleTierChange = (newTier: 'Silver' | 'Gold' | 'Platinum' | 'VIP') => {
    setTier(newTier);
    if (newTier === 'Silver') setDiscountPercent(Number(crmSettings?.silver_discount || 5));
    else if (newTier === 'Gold') setDiscountPercent(Number(crmSettings?.gold_discount || 10));
    else if (newTier === 'Platinum') setDiscountPercent(Number(crmSettings?.platinum_discount || 15));
    else if (newTier === 'VIP') setDiscountPercent(Number(crmSettings?.vip_discount || 20));
  };

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(String(customer.id));
    setIsSearching(false);
    setSearchQuery('');

    // Suggest tier if customer already has a tier badge
    const tierToSet = customer.card_tier || customer.tier;
    if (tierToSet && (['Silver', 'Gold', 'Platinum', 'VIP'] as const).includes(tierToSet as any)) {
      handleTierChange(tierToSet as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast({
        title: 'Validation Error',
        description: 'Please search and select a customer first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await issueMembershipCardAction(businessId, {
        customerId: Number(selectedCustomerId),
        tier,
        discountPercent,
        validityMonths,
      });

      if (res.success) {
        toast({
          title: 'Membership Card Issued!',
          description: `Card ${res.cardNumber} generated for ${selectedCustomer?.name || 'customer'}.`,
        });
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to issue card', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Server Error', description: err?.message || 'Error issuing card', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-card border-slate-200/80 dark:border-border/60 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-border/60">
          <DialogTitle className="text-lg font-black text-slate-900 dark:text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Issue Digital Membership Card
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Search customer by name or phone number to assign an exclusive discount card.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Customer Search & Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">
                Select Customer *
              </Label>
              {selectedCustomer && isSearching && (
                <button
                  type="button"
                  onClick={() => setIsSearching(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  Keep {selectedCustomer.name}
                </button>
              )}
            </div>

            {selectedCustomer && !isSearching ? (
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-800/50 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                    {selectedCustomer.name ? selectedCustomer.name.slice(0, 2).toUpperCase() : 'CU'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-foreground truncate">
                        {selectedCustomer.name}
                      </p>
                      {selectedCustomer.card_tier ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          {selectedCustomer.card_tier}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-mono text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedCustomer.phone}
                      {selectedCustomer.total_orders ? (
                        <span className="text-slate-400 ml-1">
                          • {selectedCustomer.total_orders} orders
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsSearching(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="rounded-xl h-8 px-2.5 text-xs font-bold border-amber-300/80 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 shrink-0"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredCustomers.length > 0) {
                          handleSelectCustomer(filteredCustomers[0]);
                        }
                      }
                    }}
                    placeholder="Search by customer name or mobile number..."
                    className="rounded-xl h-10 text-xs pl-9 pr-8 bg-slate-50 dark:bg-muted/30 focus-visible:ring-amber-500"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search Results Panel - Only shown after user types something */}
                {searchQuery.trim().length > 0 && (
                  <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card p-1.5 space-y-1 shadow-inner animate-in fade-in-50 duration-150">
                    {isSearchingServer || searchQuery !== debouncedQuery ? (
                      <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                        Searching customer...
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          No customer found matching &quot;{searchQuery}&quot;
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Try searching by exact phone number digits or name.
                        </p>
                      </div>
                    ) : (
                      filteredCustomers.map((c) => {
                        const isSelected = String(c.id) === selectedCustomerId;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/50'
                                : 'hover:bg-slate-50 dark:hover:bg-muted/50 text-slate-700 dark:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-muted text-slate-700 dark:text-foreground font-bold text-xs flex items-center justify-center shrink-0">
                                {c.name ? c.name.slice(0, 2).toUpperCase() : 'CU'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-900 dark:text-foreground truncate">
                                    {c.name}
                                  </span>
                                  {c.card_tier && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold shrink-0">
                                      {c.card_tier}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  {c.phone}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {c.total_spent ? (
                                <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                  ৳{Number(c.total_spent).toLocaleString()}
                                </span>
                              ) : null}
                              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                Pick &rarr;
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tier Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-foreground">
              Membership Tier
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {(['Silver', 'Gold', 'Platinum', 'VIP'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTierChange(t)}
                  className={`p-2.5 rounded-2xl border text-xs font-bold transition-all ${
                    tier === t
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/30'
                      : 'border-slate-200 dark:border-border bg-white dark:bg-card text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Discount Percentage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">
                Discount Percentage (%)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="rounded-xl h-10 text-xs font-mono font-bold pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
            </div>

            {/* Validity Duration */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">
                Card Validity
              </Label>
              <Select
                value={String(validityMonths)}
                onValueChange={(val) => setValidityMonths(Number(val))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="6" className="text-xs">6 Months</SelectItem>
                  <SelectItem value="12" className="text-xs">1 Year (Standard)</SelectItem>
                  <SelectItem value="24" className="text-xs">2 Years</SelectItem>
                  <SelectItem value="0" className="text-xs">Lifetime Validity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !selectedCustomerId}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  Issue Card
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
