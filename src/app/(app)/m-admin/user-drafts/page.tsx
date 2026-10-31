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
  ShoppingBag,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  MousePointerClick,
  Sparkles,
  Phone,
  Mail,
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

interface UserSummary {
  businessName: string;
  businessType: 'restaurant' | 'parlour';
  whatsappNumber: string | null;
  email: string | null;
  clientId: number | null;
  draftCount: number;
  totalItems: number;
  totalValue: number;
  latestCreatedAt: string;
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected User state: null by default (only show drafts when a user is clicked)
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [draftSearchQuery, setDraftSearchQuery] = useState('');

  // Detail Modal State
  const [selectedDraft, setSelectedDraft] = useState<UserDraftRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Delete State
  const [draftToDelete, setDraftToDelete] = useState<UserDraftRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate total price of draft items
  const getDraftTotalValue = (items: UserDraftItem[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  };

  const fetchDrafts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Sync local drafts from this browser session if present (e.g. testing as customer on same browser)
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
        search: '',
        page: 1,
        limit: 200,
      });

      if (res.success) {
        setDrafts(res.drafts);
        setStats(res.stats);
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
  }, [toast]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Aggregate drafts by User
  const usersList: UserSummary[] = useMemo(() => {
    const map = new Map<string, UserSummary>();

    for (const draft of drafts) {
      const cleanName = (draft.businessName || 'Anonymous Restaurant').trim();
      const key = cleanName.toLowerCase();
      const draftTotalVal = getDraftTotalValue(draft.items);

      if (!map.has(key)) {
        map.set(key, {
          businessName: cleanName,
          businessType: draft.businessType || 'restaurant',
          whatsappNumber: draft.whatsappNumber,
          email: draft.email,
          clientId: draft.clientId,
          draftCount: 1,
          totalItems: draft.itemCount || draft.items.length,
          totalValue: draftTotalVal,
          latestCreatedAt: draft.createdAt,
        });
      } else {
        const existing = map.get(key)!;
        existing.draftCount += 1;
        existing.totalItems += draft.itemCount || draft.items.length;
        existing.totalValue += draftTotalVal;
        if (!existing.whatsappNumber && draft.whatsappNumber) existing.whatsappNumber = draft.whatsappNumber;
        if (!existing.email && draft.email) existing.email = draft.email;
        if (!existing.clientId && draft.clientId) existing.clientId = draft.clientId;
        if (new Date(draft.createdAt) > new Date(existing.latestCreatedAt)) {
          existing.latestCreatedAt = draft.createdAt;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.draftCount - a.draftCount);
  }, [drafts]);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return usersList;
    const q = userSearchQuery.toLowerCase();
    return usersList.filter(u =>
      u.businessName.toLowerCase().includes(q) ||
      (u.whatsappNumber && u.whatsappNumber.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }, [usersList, userSearchQuery]);

  // Active selected user summary
  const selectedUserDetails = useMemo(() => {
    if (!selectedUser) return null;
    return usersList.find(u => u.businessName.toLowerCase() === selectedUser.toLowerCase()) || null;
  }, [selectedUser, usersList]);

  // Filter drafts for the currently selected user
  const displayedDrafts = useMemo(() => {
    if (!selectedUser) return [];

    let list = drafts.filter(
      d => (d.businessName || '').trim().toLowerCase() === selectedUser.toLowerCase()
    );

    if (draftSearchQuery.trim()) {
      const q = draftSearchQuery.toLowerCase();
      list = list.filter(d =>
        d.draftName.toLowerCase().includes(q) ||
        d.items.some(item => (item.name || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q))
      );
    }

    return list;
  }, [drafts, selectedUser, draftSearchQuery]);

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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 min-w-0 w-full max-w-full overflow-x-hidden">
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full max-w-full min-w-0">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                <BookmarkCheck className="h-6 w-6 stroke-[2.2]" />
              </span>
              User Saved Drafts
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Select any client from the list below to review their saved draft items, menus, and configured pricing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDrafts(true)}
              disabled={isLoading || isRefreshing}
              className="h-9 px-3 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs font-medium"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <Card className="border-slate-200/80 shadow-xs bg-white">
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

          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Clients
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

          <Card className="border-slate-200/80 shadow-xs bg-white">
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
              <p className="text-xs text-slate-500 mt-0.5">Dishes and services saved</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs bg-white">
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

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
          
          {/* Left Column: User List (lg:col-span-4 xl:col-span-4) */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-3">
            <Card className="border-slate-200/90 shadow-xs bg-white overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-orange-600" />
                    Clients ({usersList.length})
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Click to view drafts</span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search client by name or phone..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs border-slate-200 bg-white shadow-2xs"
                  />
                </div>
              </div>

              {/* User Selection List */}
              <div className="p-2.5 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-3 space-y-2 border border-slate-100 rounded-xl">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                    <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No clients found</p>
                    <p className="text-[11px] text-slate-400">Drafts will appear here when saved.</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUser?.toLowerCase() === user.businessName.toLowerCase();
                    const isParlour = user.businessType === 'parlour';

                    return (
                      <button
                        key={user.businessName}
                        type="button"
                        onClick={() => setSelectedUser(user.businessName)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer border relative overflow-hidden group ${
                          isSelected
                            ? 'bg-orange-50/90 border-orange-400 shadow-sm ring-2 ring-orange-500/20'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        {/* Active vertical accent bar */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-600" />
                        )}

                        <div className="flex items-center gap-3 min-w-0 pl-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                            isParlour
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {isParlour ? <Scissors className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 truncate">
                                {decodeHtmlEntities(user.businessName)}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 rounded font-semibold border-0 ${
                                  isParlour
                                    ? 'bg-pink-50 text-pink-700'
                                    : 'bg-orange-50 text-orange-700'
                                }`}
                              >
                                {isParlour ? 'Parlour' : 'Restaurant'}
                              </Badge>
                            </div>

                            <div className="text-xs text-slate-500 truncate flex items-center gap-2 mt-0.5">
                              {user.whatsappNumber ? (
                                <span className="text-emerald-700 font-mono text-[11px] font-medium flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  {user.whatsappNumber}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">No phone</span>
                              )}
                              <span>·</span>
                              <span className="text-[11px] text-slate-600 font-medium">
                                {user.totalItems} items
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <Badge className={`text-xs px-2 py-0.5 font-bold ${
                            isSelected ? 'bg-orange-600 text-white' : 'bg-slate-900 text-white'
                          }`}>
                            {user.draftCount} {user.draftCount === 1 ? 'draft' : 'drafts'}
                          </Badge>
                          <span className="text-[11px] font-bold text-slate-800 mt-1 font-mono">
                            ৳{user.totalValue.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: User Drafts (lg:col-span-8 xl:col-span-8) */}
          <div className="lg:col-span-8 xl:col-span-8 min-w-0">
            {!selectedUser ? (
              /* Hero Empty State: Prompts user to click a client */
              <Card className="border-slate-200/80 shadow-xs bg-white p-12 text-center min-h-[440px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mb-4 shadow-xs">
                  <MousePointerClick className="h-8 w-8 stroke-[1.8] animate-bounce" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Select a Client to View Drafts</h3>
                <p className="text-slate-500 text-xs sm:text-sm max-w-md mt-1.5">
                  Click on any restaurant or parlour in the left list to review their saved drafts, selected food items, and pricing.
                </p>
              </Card>
            ) : (
              /* Selected Client Drafts View */
              <div className="space-y-4">
                {/* Client Profile Header Banner */}
                <Card className="border-slate-200/90 shadow-xs bg-white overflow-hidden">
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-sm ${
                        selectedUserDetails?.businessType === 'parlour'
                          ? 'bg-pink-100 text-pink-700 border border-pink-200'
                          : 'bg-orange-100 text-orange-700 border border-orange-200'
                      }`}>
                        {selectedUserDetails?.businessType === 'parlour' ? <Scissors className="h-6 w-6" /> : <Utensils className="h-6 w-6" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                            {decodeHtmlEntities(selectedUser)}
                          </h2>
                          <Badge variant="outline" className={`text-xs capitalize font-semibold border ${
                            selectedUserDetails?.businessType === 'parlour'
                              ? 'bg-pink-50 text-pink-700 border-pink-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            {selectedUserDetails?.businessType}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          {selectedUserDetails?.whatsappNumber && (
                            <span className="flex items-center gap-1 font-mono text-slate-700">
                              <Phone className="h-3 w-3 text-emerald-600" />
                              {selectedUserDetails.whatsappNumber}
                            </span>
                          )}
                          {selectedUserDetails?.email && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Mail className="h-3 w-3 text-slate-400" />
                              {selectedUserDetails.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Action */}
                    {selectedUserDetails?.whatsappNumber && (
                      <a
                        href={`https://wa.me/${selectedUserDetails.whatsappNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors w-fit shrink-0"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Chat on WhatsApp
                      </a>
                    )}
                  </div>

                  {/* Summary Bar */}
                  <div className="p-4 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-semibold text-slate-700">
                        {displayedDrafts.length} {displayedDrafts.length === 1 ? 'Draft' : 'Drafts'}
                      </span>
                      <span>·</span>
                      <span className="text-slate-600">
                        {selectedUserDetails?.totalItems || 0} Total Saved Items
                      </span>
                      <span>·</span>
                      <span className="font-bold text-slate-900 font-mono">
                        Total Est. ৳{(selectedUserDetails?.totalValue || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Search inside drafts..."
                        value={draftSearchQuery}
                        onChange={(e) => setDraftSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </Card>

                {/* Drafts Table */}
                <Card className="border-slate-200/90 shadow-xs bg-white overflow-hidden w-full">
                  <div className="overflow-x-auto w-full">
                    <Table className="w-full">
                      <TableHeader className="bg-slate-50/80">
                        <TableRow className="border-slate-200">
                          <TableHead className="font-semibold text-slate-700 text-xs min-w-[200px]">Draft Title & Date</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-xs min-w-[280px]">Dishes & Items</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-xs min-w-[110px]">Est. Value</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-xs text-right min-w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedDrafts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-12 text-center">
                              <p className="text-sm font-semibold text-slate-700">No Drafts Matching Search</p>
                              <p className="text-xs text-slate-400 mt-1">Try another search term.</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayedDrafts.map((draft) => {
                            const totalValue = getDraftTotalValue(draft.items);

                            return (
                              <TableRow key={draft.id || draft.draftId} className="border-slate-100 hover:bg-slate-50/60 transition-colors">
                                {/* Draft Title & Date */}
                                <TableCell className="align-middle">
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 truncate" title={draft.draftName}>
                                      {draft.draftName}
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                      <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                                      {formatDateDisplay(draft.createdAt)}
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Items Preview */}
                                <TableCell className="align-middle">
                                  <div className="space-y-1.5 max-w-lg">
                                    <div className="flex items-center gap-1.5">
                                      <Badge className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                        {draft.itemCount} {draft.itemCount === 1 ? 'Item' : 'Items'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-slate-600 truncate leading-relaxed" title={draft.items.map(i => i.name).join(', ')}>
                                      {draft.items.slice(0, 3).map(i => decodeHtmlEntities(i.name)).join(', ')}
                                      {draft.items.length > 3 && (
                                        <span className="text-slate-400 font-semibold"> +{draft.items.length - 3} more</span>
                                      )}
                                    </p>
                                  </div>
                                </TableCell>

                                {/* Estimated Value */}
                                <TableCell className="align-middle">
                                  <span className="font-bold text-sm text-slate-900 font-mono">
                                    ৳{totalValue.toLocaleString()}
                                  </span>
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="align-middle text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2.5 text-xs font-semibold gap-1 text-slate-700 hover:text-orange-600 hover:border-orange-300 cursor-pointer shadow-2xs"
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
                                        className="h-8 w-8 text-slate-500 hover:text-slate-900 cursor-pointer"
                                        title="Open public share view"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Button>
                                    </a>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
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
              </div>
            )}
          </div>
        </div>

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
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
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
    </div>
  );
}
