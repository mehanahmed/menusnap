'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { CustomerOrderRecord } from '@/app/actions/customer-orders';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Printer,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  XCircle,
  ArrowLeft,
  Share2,
  Check,
  Copy,
  Receipt,
  Sparkles,
  Phone,
  Calendar,
  MapPin,
  Lock,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

interface OrderReceiptClientProps {
  order: CustomerOrderRecord;
}

export default function OrderReceiptClient({ order }: OrderReceiptClientProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const formattedDateTime = useMemo(() => {
    if (!order.createdAt) return 'Just now';
    try {
      const parsed = parseISO(order.createdAt);
      if (isValid(parsed)) {
        return format(parsed, 'MMM d, yyyy • hh:mm a');
      }
      return order.createdAt;
    } catch {
      return order.createdAt;
    }
  }, [order.createdAt]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  const handleCopyId = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(order.orderId).then(() => {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      });
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs print:bg-emerald-50 print:text-emerald-900 print:border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 print:hidden animate-pulse" />
            <CheckCircle2 className="w-3.5 h-3.5 print:text-emerald-800" />
            <span>Order Completed</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs print:bg-blue-50 print:text-blue-900 print:border-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 print:hidden animate-pulse" />
            <UtensilsCrossed className="w-3.5 h-3.5 print:text-blue-800" />
            <span>Kitchen Preparing</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs print:bg-rose-50 print:text-rose-900 print:border-rose-300">
            <XCircle className="w-3.5 h-3.5 print:text-rose-800" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs print:bg-amber-50 print:text-amber-900 print:border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 print:hidden animate-pulse" />
            <Clock className="w-3.5 h-3.5 print:text-amber-800" />
            <span>Order Placed (Active)</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/80 py-8 px-4 sm:px-6 flex flex-col items-center justify-center font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Action Bar (hidden when printing) */}
      <div className="w-full max-w-[420px] flex items-center justify-between mb-4 print:hidden">
        {order.draftId ? (
          <Link href={`/draft/view/${order.draftId}?customer=1`}>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-white/80 hover:bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Menu</span>
            </button>
          </Link>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all active:scale-95"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedLink ? 'Copied' : 'Share Receipt'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Thermal Receipt Container */}
      <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.12)] border border-slate-200/80 overflow-hidden relative transition-all print:shadow-none print:border print:border-slate-300 print:rounded-2xl print:max-w-[460px] print:mx-auto">
        {/* Top Dark Restaurant Branding Header (adapts cleanly to print) */}
        <div className="bg-slate-950 text-white px-6 pt-7 pb-6 text-center relative overflow-hidden print:bg-white print:text-slate-950 print:border-b print:border-slate-200 print:pt-6 print:pb-5">
          {/* Subtle background glow accent (hidden in print) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none print:hidden" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-white mb-2.5 shadow-inner border border-white/15 print:bg-slate-100 print:border-slate-300 print:text-slate-950">
              <Receipt className="w-6 h-6 text-emerald-400 print:text-emerald-700" />
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-slate-950 leading-tight">
              {order.businessName}
            </h1>
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 print:text-slate-600 uppercase mt-0.5">
              Verified Dining Ticket
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs print:bg-emerald-50 print:text-emerald-800 print:border-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-700 shrink-0" />
              <span>Official Restaurant Bill</span>
            </div>
          </div>
        </div>

        {/* Receipt Content Section */}
        <div className="p-6 space-y-5 text-sm bg-white">
          {/* Order ID & Live Status Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-dashed border-slate-200">
            <div>
              <p className="text-[10px] text-slate-400 print:text-slate-600 uppercase tracking-widest font-bold">Reference ID</p>
              <button
                type="button"
                onClick={handleCopyId}
                className="group flex items-center gap-1.5 text-base font-black font-mono text-slate-900 hover:text-primary transition-colors text-left"
                title="Click to copy order ID"
              >
                <span>#{order.orderId}</span>
                <Copy className="w-3 h-3 text-slate-400 group-hover:text-primary transition-colors opacity-70 print:hidden" />
                {copiedId && <span className="text-[10px] text-emerald-600 font-sans font-semibold print:hidden">Copied!</span>}
              </button>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 print:text-slate-600 uppercase tracking-widest font-bold mb-1">Status</p>
              {getStatusBadge(order.status)}
            </div>
          </div>

          {/* Table, Customer & Timestamp Matrix */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs print:bg-slate-50 print:border-slate-200">
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 print:text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400 print:text-slate-600 shrink-0" />
                <span>Seating</span>
              </div>
              <p className="font-bold text-slate-900 text-sm mt-1">
                {order.tableNumber ? `Table ${order.tableNumber.replace(/^table\s*/i, '')}` : 'Dine-In / Counter'}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 print:text-slate-600 mt-1">
                <Calendar className="w-3 h-3 text-slate-400 print:text-slate-600 shrink-0" />
                <span className="font-mono">{formattedDateTime}</span>
              </div>
            </div>

            <div className="text-right border-l border-slate-200/60 pl-3 print:border-slate-300">
              <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-500 print:text-slate-700">
                <span>Customer</span>
              </div>
              <p className="font-bold text-slate-900 text-sm mt-1 truncate">
                {order.customerName}
              </p>
              <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500 print:text-slate-700 font-mono mt-1">
                <Phone className="w-3 h-3 text-slate-400 print:text-slate-600 shrink-0" />
                <span>{order.customerPhone}</span>
              </div>
            </div>
          </div>

          {/* Itemized Order Breakdown */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider pb-2 border-b border-slate-200">
              <span>Item & Selection</span>
              <span className="text-right">Amount</span>
            </div>

            <div className="divide-y divide-slate-100 print:divide-slate-200">
              {order.items.map((item, index) => (
                <div key={item.key || index} className="py-3 flex justify-between items-start text-xs">
                  <div className="pr-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-black text-slate-900 text-sm">{item.quantity}×</span>
                      <span className="font-semibold text-slate-900 leading-snug">{item.name}</span>
                    </div>
                    {item.variationName && (
                      <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-700 border border-slate-200/60 print:bg-slate-100 print:border-slate-300">
                        {item.variationName}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 shrink-0 font-mono text-sm pt-0.5">
                    ৳{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Special Notes (if customer provided instructions) */}
          {order.specialNote && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs print:bg-amber-50 print:border-amber-300">
              <span className="font-bold text-amber-900 block text-[11px] uppercase tracking-wider">
                Kitchen Instructions:
              </span>
              <p className="text-amber-800 italic mt-0.5">{order.specialNote}</p>
            </div>
          )}

          {/* Subtotal & Total Bill Section */}
          <div className="pt-3 border-t-2 border-slate-900">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 print:text-slate-700 uppercase tracking-widest font-black">Total Payable</p>
                <p className="text-[11px] text-slate-400 print:text-slate-500 font-medium">Server verified billing amount</p>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                  ৳{order.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Enterprise Production Trust & Security Stamp */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden print:bg-slate-50 print:border print:border-slate-300 print:text-slate-900">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5 border border-emerald-500/30 print:bg-emerald-100 print:text-emerald-800 print:border-emerald-300">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white print:text-slate-950">MenuSnap Order Protection™</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase print:bg-emerald-100 print:text-emerald-800 print:border print:border-emerald-300">
                    Tamper-Proof
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 print:text-slate-700 leading-relaxed font-normal">
                  Authorized digital transaction for cashier settlement. Billed items and pricing are cryptographically locked at time of order.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Scalloped Receipt Cut Edge (hidden in print) */}
        <div 
          className="h-3 w-full bg-slate-100/80 border-t border-dashed border-slate-300 print:hidden"
          style={{
            maskImage: 'radial-gradient(circle at 10px -5px, transparent 10px, white 11px)',
            WebkitMaskImage: 'radial-gradient(circle at 10px -5px, transparent 10px, white 11px)',
            maskSize: '20px 20px',
            WebkitMaskSize: '20px 20px',
            maskRepeat: 'repeat-x',
            WebkitMaskRepeat: 'repeat-x',
          }} 
        />
      </div>

      {/* Subtle Footer Branding */}
      <div className="mt-5 text-center text-xs text-slate-400 print:hidden flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary opacity-80" />
        <span>Powered by <span className="font-bold text-slate-700">MenuSnap Digital Menu System</span></span>
      </div>

      {/* Embedded print CSS for crisp contrast and page margins */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: portrait;
              margin: 8mm;
            }
            body {
              background-color: #ffffff !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `
      }} />
    </div>
  );
}
