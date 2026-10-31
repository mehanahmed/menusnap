"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  BookmarkCheck,
  Building2,
  Utensils,
  Scissors,
  Search,
  RefreshCw,
  Eye,
  ExternalLink,
  Trash2,
  Calendar,
  Layers,
  MessageCircle,
  Tag,
  DollarSign,
  ChevronRight,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';
import { decodeHtmlEntities } from '@/lib/utils';
import {
  getUserDraftsAction,
  deleteUserDraftAction,
  batchSyncUserDraftsAction,
  type UserDraftRecord,
  type UserDraftStats,
  type UserDraftItem,
} from '@/app/actions/user-drafts';

export default function UserDraftsAdminPage() {
  const { toast } = useToast();

  const [drafts, setDrafts] = useState<UserDraftRecord[]>([]);
  const [stats, setStats] = useState<UserDraftStats>({
    totalDrafts: 0,
    totalUniqueBusinesses: 0,
    totalSavedItems: 0,
    restaurantDrafts: 0,
    parlourDrafts: 0,
  });
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<'all' | 'restaurant' | 'parlour'>('all');

  // Detail Modal State
  const [selectedDraft, setSelectedDraft] = useState<UserDraftRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Delete State
  const [draftToDelete, setDraftToDelete] = useState<UserDraftRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDrafts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Sync local drafts from this browser session if present
      if (typeof window !== 'undefined') {
        try {
          const rawLocalDrafts = localStorage.getItem('menuBuilderDrafts');
          if (rawLocalDrafts) {
            const parsed = JSON.parse(rawLocalDrafts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              let bName = 'tanmoy';
              let bType = 'restaurant';
              let wa: string | undefined = undefined;
              let em: string | undefined = undefined;
              try {
                const u = JSON.parse(localStorage.getItem('colorHutClientUser') || '{}');
                if (u.businessName || u.name) bName = u.businessName || u.name;
                if (u.type) bType = u.type;
                if (u.whatsappNumber || u.phone) wa = u.whatsappNumber || u.phone;
                if (u.email) em = u.email;
              } catch {}

              await batchSyncUserDraftsAction(
                parsed.map((d: any) => ({
                  draftId: String(d.id || d.draftId || `draft-${Date.now()}`),
                  draftName: String(d.name || d.draftName || 'Saved Draft'),
                  businessName: bName,
                  businessType: bType,
                  whatsappNumber: wa,
                  email: em,
                  primaryTag: d.primaryTag || undefined,
                  items: Array.isArray(d.items) ? d.items : [],
                  itemCount: typeof d.itemCount === 'number' ? d.itemCount : (Array.isArray(d.items) ? d.items.length : 0),
                  createdAt: d.createdAt,
                }))
              );
            }
          }
        } catch (syncErr) {
          console.warn('Local draft sync check error:', syncErr);
        }
      }

      const res = await getUserDraftsAction({
        search: searchQuery,
        businessType: businessTypeFilter,
        page: 1,
        limit: 100,
      });

      if (res.success) {
        setDrafts(res.drafts);
        setStats(res.stats);
        setTotal(res.total);
      } else {
        toast({
          title: "Error Loading Drafts",
          description: res.error || "Failed to fetch user drafts.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Network Error",
        description: err.message || "Could not retrieve user drafts from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, businessTypeFilter, toast]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Handle draft delete
  const confirmDelete = async () => {
    if (!draftToDelete) return;

    setIsDeleting(true);
    try {
      const res = await deleteUserDraftAction(draftToDelete.draftId);
      if (res.success) {
        toast({
          title: "Draft Deleted",
          description: `Draft "${draftToDelete.draftName}" has been removed.`,
        });
        setDrafts(prev => prev.filter(d => d.draftId !== draftToDelete.draftId));
        setStats(prev => ({
          ...prev,
          totalDrafts: Math.max(0, prev.totalDrafts - 1),
          totalSavedItems: Math.max(0, prev.totalSavedItems - draftToDelete.itemCount),
        }));
        setTotal(prev => Math.max(0, prev - 1));
      } else {
        toast({
          title: "Delete Failed",
          description: res.error || "Could not delete user draft.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Delete Error",
        description: err.message || "Failed to delete draft.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDraftToDelete(null);
    }
  };

  // Safe date formatter
  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'Recent';
    try {
      const parsed = parseISO(dateString);
      if (isValid(parsed)) {
        return format(parsed, 'MMM dd, yyyy · hh:mm a');
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  // Calculate total menu price of a draft
  const getDraftTotalValue = (items: UserDraftItem[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
              <BookmarkCheck className="h-6 w-6 stroke-[2.2]" />
            </span>
            User Saved Drafts
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time track of which restaurant or parlour is saving which items to their drafts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDrafts(true)}
            disabled={isLoading || isRefreshing}
            className="h-9 px-3 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Saved Drafts
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <BookmarkCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">{stats.totalDrafts}</div>
            <p className="text-xs text-slate-500 mt-0.5">Across all client accounts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unique Businesses
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">{stats.totalUniqueBusinesses}</div>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.restaurantDrafts} Restaurants · {stats.parlourDrafts} Parlours
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Items Drafted
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">{stats.totalSavedItems}</div>
            <p className="text-xs text-slate-500 mt-0.5">Dishes and services configured</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Items / Draft
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              {stats.totalDrafts > 0 ? (stats.totalSavedItems / stats.totalDrafts).toFixed(1) : '0'}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Items selected per draft</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search restaurant, item name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm border-slate-200 bg-slate-50/50 focus-visible:bg-white"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select
              value={businessTypeFilter}
              onValueChange={(val: any) => setBusinessTypeFilter(val)}
            >
              <SelectTrigger className="h-9 w-full sm:w-44 text-xs border-slate-200 bg-slate-50/50">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="restaurant">Restaurants 🍔</SelectItem>
                <SelectItem value="parlour">Parlours 💇‍♀️</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Drafts List Table */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-200">
                <TableHead className="font-semibold text-slate-700 text-xs">Business / Restaurant</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs">Draft Name & Date</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs">Items Saved</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs">Est. Value</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-slate-100">
                    <TableCell><Skeleton className="h-10 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : drafts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center text-slate-400">
                      <div className="p-3 bg-slate-100 rounded-2xl mb-3">
                        <BookmarkCheck className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-base font-semibold text-slate-700">No User Drafts Found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        When users or restaurants save drafts in MagicTab, they will instantly appear here with their full item details.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                drafts.map((draft) => {
                  const totalValue = getDraftTotalValue(draft.items);
                  const isParlour = draft.businessType === 'parlour' || draft.primaryTag === 'parlour';

                  return (
                    <TableRow key={draft.id || draft.draftId} className="border-slate-100 hover:bg-slate-50/60 transition-colors">
                      {/* Business & Restaurant */}
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isParlour ? 'bg-pink-100 text-pink-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {isParlour ? <Scissors className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-slate-900 truncate">
                                {decodeHtmlEntities(draft.businessName)}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 rounded font-medium border-0 ${
                                  isParlour
                                    ? 'bg-pink-50 text-pink-700'
                                    : 'bg-orange-50 text-orange-700'
                                }`}
                              >
                                {isParlour ? 'Parlour' : 'Restaurant'}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              {draft.whatsappNumber ? (
                                <a
                                  href={`https://wa.me/${draft.whatsappNumber.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  {draft.whatsappNumber}
                                </a>
                              ) : (
                                <span className="text-slate-400">Guest / Unregistered</span>
                              )}
                              {draft.email && (
                                <span className="truncate max-w-[140px] text-slate-400">· {draft.email}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Draft Details */}
                      <TableCell className="align-middle">
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-slate-800 truncate" title={draft.draftName}>
                            {draft.draftName}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {formatDateDisplay(draft.createdAt)}
                          </div>
                        </div>
                      </TableCell>

                      {/* Items Preview */}
                      <TableCell className="align-middle">
                        <div className="space-y-1 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                              {draft.itemCount} {draft.itemCount === 1 ? 'Item' : 'Items'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 truncate" title={draft.items.map(i => i.name).join(', ')}>
                            {draft.items.slice(0, 3).map(i => decodeHtmlEntities(i.name)).join(', ')}
                            {draft.items.length > 3 && (
                              <span className="text-slate-400 font-medium"> +{draft.items.length - 3} more</span>
                            )}
                          </p>
                        </div>
                      </TableCell>

                      {/* Estimated Value */}
                      <TableCell className="align-middle">
                        <span className="font-semibold text-sm text-slate-900">
                          ৳{totalValue.toLocaleString()}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold gap-1 text-slate-700 hover:text-orange-600 hover:border-orange-300"
                            onClick={() => {
                              setSelectedDraft(draft);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Items
                          </Button>

                          <a
                            href={`/draft/view/${draft.draftId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-slate-900"
                              title="Open public share view"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDraftToDelete(draft)}
                            title="Delete Draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
      </Card>

      {/* Detailed Items Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                    <Utensils className="h-4 w-4" />
                  </span>
                  {selectedDraft ? decodeHtmlEntities(selectedDraft.businessName) : 'Draft Items'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  {selectedDraft?.draftName} · Saved on {formatDateDisplay(selectedDraft?.createdAt)}
                </DialogDescription>
              </div>

              {selectedDraft?.whatsappNumber && (
                <a
                  href={`https://wa.me/${selectedDraft.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
          </DialogHeader>

          {/* Items Content Scroll Area */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span className="font-semibold uppercase tracking-wider">
                Total Saved Items ({selectedDraft?.items?.length || 0})
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                Total: ৳{selectedDraft ? getDraftTotalValue(selectedDraft.items).toLocaleString() : 0}
              </span>
            </div>

            <div className="space-y-2">
              {selectedDraft?.items && selectedDraft.items.length > 0 ? (
                selectedDraft.items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900">
                          {decodeHtmlEntities(item.name)}
                        </span>
                        {item.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-slate-200 text-slate-600 bg-white">
                            {decodeHtmlEntities(item.category)}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {decodeHtmlEntities(item.description)}
                        </p>
                      )}
                      {Array.isArray(item.subItems) && item.subItems.length > 0 && (
                        <div className="pt-1.5 pl-2 border-l-2 border-orange-200 space-y-0.5">
                          <p className="text-[10px] uppercase font-semibold text-slate-400">Variations / Addons:</p>
                          {item.subItems.map((sub: any, subIdx: number) => (
                            <div key={sub.id || subIdx} className="text-xs text-slate-600 flex items-center justify-between gap-2">
                              <span>• {decodeHtmlEntities(sub.name)}</span>
                              <span className="font-mono text-slate-500">৳{Number(sub.price || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm text-slate-900">
                        ৳{Number(item.price || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No items recorded in this draft.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailOpen(false)}
            >
              Close
            </Button>
            {selectedDraft && (
              <a
                href={`/draft/view/${selectedDraft.draftId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Live Customer Preview
                </Button>
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!draftToDelete} onOpenChange={(open) => !open && setDraftToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft from <strong>{draftToDelete?.businessName}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Draft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
