'use client';

import React, { useState, useRef } from 'react';
import { 
  ShoppingBag, 
  ArrowRight, 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Phone,
  User,
  UtensilsCrossed,
  Download,
  Loader2,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn, decodeHtmlEntities } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createCustomerOrderAction } from '@/app/actions/customer-orders';

export interface CartItem {
  key: string;
  name: string;
  variationName?: string;
  price: number;
  quantity: number;
}

interface CustomerOrderBarProps {
  cart: Record<string, CartItem>;
  currencySymbol: string;
  businessName: string;
  businessPhone?: string;
  draftId?: string;
  clientId?: number | null;
  tableNumber?: string;
  onUpdateQuantity: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
}

export function CustomerOrderBar({
  cart,
  currencySymbol,
  businessName,
  businessPhone,
  draftId,
  clientId,
  tableNumber: initialTableNumber,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CustomerOrderBarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState(initialTableNumber || '');

  React.useEffect(() => {
    if (initialTableNumber) {
      setTableNumber(initialTableNumber);
    }
  }, [initialTableNumber]);
  const [specialNote, setSpecialNote] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [orderSuccessData, setOrderSuccessData] = useState<{
    orderId: string;
    name: string;
    phone: string;
    table?: string;
    note?: string;
    items: CartItem[];
    total: number;
    placedAt: string;
    whatsappUrl?: string;
  } | null>(null);

  const { toast } = useToast();

  const cartItems = Object.values(cart).filter((item) => item.quantity > 0);
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalOrderAmount = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || !orderSuccessData) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        skipFonts: true,
        backgroundColor: '#FFFFFF',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeId = orderSuccessData.orderId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeBiz = (businessName || 'order').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `receipt-${safeBiz}-${safeId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({
        title: 'Receipt Image Downloaded!',
        description: `Order receipt #${orderSuccessData.orderId} saved as PNG.`,
      });
    } catch (err) {
      console.error('Failed to download receipt image:', err);
      toast({
        title: 'Download Failed',
        description: 'Could not generate receipt image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (totalItemsCount === 0 && !orderSuccessData) {
    return null;
  }

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();

    if (!cleanName) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to place the order.',
        variant: 'destructive',
      });
      return;
    }

    if (!cleanPhone || cleanPhone.length < 6) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter a valid contact number so we can reach you.',
        variant: 'destructive',
      });
      return;
    }

    const cleanTable = (initialTableNumber || tableNumber || '').trim();
    // Generate order ID
    const fakeOrderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderPayload = {
      orderId: fakeOrderId,
      clientId: clientId || null,
      businessName,
      draftId: draftId || null,
      customerName: cleanName,
      customerPhone: cleanPhone,
      tableNumber: cleanTable || undefined,
      specialNote: specialNote.trim() || undefined,
      items: [...cartItems],
      totalAmount: totalOrderAmount,
    };

    // Save to MySQL in background
    createCustomerOrderAction(orderPayload).catch((err) => {
      console.warn('Customer order database persistence notice:', err);
    });

    // Also persist to localStorage for instant client-side sync across tabs
    try {
      const existingRaw = localStorage.getItem('menusnap_customer_orders');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [
        {
          id: Date.now(),
          ...orderPayload,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        ...existing,
      ];
      localStorage.setItem('menusnap_customer_orders', JSON.stringify(updated.slice(0, 100)));

      // Broadcast to any open admin order dashboard tabs in real time (0ms)
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('menusnap_orders_channel');
        channel.postMessage({ type: 'NEW_ORDER', orderId: fakeOrderId });
        channel.close();
      }
    } catch {}

    // Format clean WhatsApp recipient phone
    const rawTargetPhone = businessPhone || '';
    const cleanDigits = rawTargetPhone.replace(/[^0-9]/g, '');
    let formattedBusinessWa = cleanDigits;
    if (cleanDigits.length === 11 && cleanDigits.startsWith('01')) {
      formattedBusinessWa = `880${cleanDigits.slice(1)}`;
    } else if (cleanDigits.length === 10 && cleanDigits.startsWith('1')) {
      formattedBusinessWa = `880${cleanDigits}`;
    }

    // Build human-friendly WhatsApp order message
    const itemsSummary = cartItems
      .map(
        (item) =>
          `• ${item.quantity}× ${decodeHtmlEntities(item.name)}${
            item.variationName ? ` (${decodeHtmlEntities(item.variationName)})` : ''
          } — ${currencySymbol}${(item.price * item.quantity).toLocaleString()}`
      )
      .join('\n');

    const tableLine = cleanTable
      ? `📍 *Table:* Table ${cleanTable.replace(/^table\s*/i, '').trim()}\n`
      : '';
    const noteLine = specialNote.trim()
      ? `📝 *Special Note:* ${specialNote.trim()}\n`
      : '';

    const waText = 
`🍽️ *NEW ORDER - ${decodeHtmlEntities(businessName || 'Restaurant')}*
━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* #${fakeOrderId}
${tableLine}👤 *Customer:* ${cleanName} (${cleanPhone})

📋 *Items Ordered:*
${itemsSummary}

💰 *Total Bill:* ${currencySymbol}${totalOrderAmount.toLocaleString()}
${noteLine}⏰ *Time:* ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
━━━━━━━━━━━━━━━━━━━━
_Sent via MenuSnap Digital Menu_`;

    const encodedText = encodeURIComponent(waText);
    const waUrl = formattedBusinessWa
      ? `https://api.whatsapp.com/send?phone=${formattedBusinessWa}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    // Automatically trigger WhatsApp in a new window / app
    if (typeof window !== 'undefined') {
      try {
        window.open(waUrl, '_blank');
      } catch (err) {
        console.warn('WhatsApp auto-open popup notice:', err);
      }
    }

    setOrderSuccessData({
      orderId: fakeOrderId,
      name: cleanName,
      phone: cleanPhone,
      table: cleanTable || undefined,
      note: specialNote.trim() || undefined,
      items: [...cartItems],
      total: totalOrderAmount,
      placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      whatsappUrl: waUrl,
    });

    onClearCart();
    toast({
      title: 'Order Placed Successfully!',
      description: `Order #${fakeOrderId} placed for ${cleanName}.`,
    });
  };

  const handleReset = () => {
    setOrderSuccessData(null);
    setCustomerName('');
    setCustomerPhone('');
    setTableNumber(initialTableNumber || '');
    setSpecialNote('');
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Floating Bottom Order Bar */}
      {totalItemsCount > 0 && !orderSuccessData && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-lg px-2 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-zinc-950/95 text-white dark:bg-zinc-900/95 border border-white/15 shadow-2xl rounded-2xl p-3 sm:p-3.5 flex items-center justify-between backdrop-blur-md">
            {/* Left: Cart Icon with Badge & Price */}
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shrink-0">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] font-extrabold min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-xs border-2 border-zinc-950">
                  {totalItemsCount}
                </span>
              </div>
              <div className="leading-tight">
                <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
                  {tableNumber && (
                    <span className="text-amber-400 font-bold">
                      Table {tableNumber.replace(/^table\s*/i, '').trim()} •
                    </span>
                  )}
                  <span>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} selected</span>
                </p>
                <p className="text-base sm:text-lg font-black text-white tracking-tight">
                  {currencySymbol}{totalOrderAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Right: Order Now Button */}
            <Button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 h-10 rounded-xl shadow-lg gap-2 shrink-0 transition-transform active:scale-95"
            >
              <span>Order Now</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Order Review & Placement Modal */}
      <Dialog
        open={isModalOpen || Boolean(orderSuccessData)}
        onOpenChange={(open) => {
          if (!open) {
            if (orderSuccessData) {
              handleReset();
            } else {
              setIsModalOpen(false);
            }
          }
        }}
      >
        <DialogContent className="max-w-md w-[94vw] p-0 overflow-hidden rounded-2xl bg-card border border-border shadow-2xl max-h-[92vh] flex flex-col [&>button.absolute]:hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  {orderSuccessData ? 'Order Confirmation' : 'Review Your Order'}
                </DialogTitle>
                {tableNumber && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                    Table {tableNumber.replace(/^table\s*/i, '').trim()}
                  </span>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {businessName}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (orderSuccessData) handleReset();
                else setIsModalOpen(false);
              }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {orderSuccessData ? (
              /* Success View */
              <div className="text-center py-2 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">
                    Order Placed Successfully!
                  </h3>
                  <Badge variant="outline" className="text-xs font-mono font-bold border-emerald-500/30 text-emerald-600 bg-emerald-500/5 px-2.5 py-0.5">
                    Order ID: {orderSuccessData.orderId}
                  </Badge>
                  <p className="text-xs text-muted-foreground pt-0.5">
                    Customer: <span className="font-semibold text-foreground">{orderSuccessData.name}</span> ({orderSuccessData.phone})
                  </p>
                </div>

                {/* Printable / Downloadable Visual Receipt Card */}
                <div
                  ref={receiptRef}
                  className="bg-white text-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm text-left space-y-3 font-sans"
                >
                  {/* Top Business & Order Header */}
                  <div className="text-center pb-3 border-b border-dashed border-zinc-300 space-y-0.5">
                    <p className="font-black text-sm sm:text-base tracking-tight text-zinc-950 uppercase">{businessName}</p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Order Receipt</p>
                    <div className="flex items-center justify-center gap-2 pt-1 text-[11px]">
                      <span className="font-mono font-bold bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-zinc-200">
                        #{orderSuccessData.orderId}
                      </span>
                      <span className="text-zinc-500 font-medium">{orderSuccessData.placedAt}</span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="text-xs space-y-1 py-1.5 border-b border-dashed border-zinc-300 text-zinc-700">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">Customer:</span>
                      <span className="font-bold text-zinc-900">{orderSuccessData.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">Phone:</span>
                      <span className="font-semibold text-zinc-900 font-mono">{orderSuccessData.phone}</span>
                    </div>
                    {orderSuccessData.table && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-medium">Table No:</span>
                        <span className="font-bold text-zinc-900">{orderSuccessData.table}</span>
                      </div>
                    )}
                    {orderSuccessData.note && (
                      <div className="flex justify-between items-start gap-2 pt-0.5">
                        <span className="text-zinc-500 font-medium shrink-0">Note:</span>
                        <span className="font-medium text-zinc-800 text-right italic text-[11px]">{orderSuccessData.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Ordered Items List */}
                  <div className="space-y-1.5 py-1">
                    <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                      Items Ordered ({orderSuccessData.items.reduce((sum, it) => sum + it.quantity, 0)}):
                    </p>
                    <div className="divide-y divide-zinc-100">
                      {orderSuccessData.items.map((item) => (
                        <div key={item.key} className="py-1.5 flex justify-between items-start text-xs">
                          <div className="pr-2">
                            <span className="font-semibold text-zinc-900">
                              {item.quantity}× {decodeHtmlEntities(item.name)}
                            </span>
                            {item.variationName && (
                              <span className="block text-[11px] text-zinc-500 font-normal">
                                ({decodeHtmlEntities(item.variationName)})
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-zinc-900 shrink-0">
                            {currencySymbol}{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Bill */}
                  <div className="pt-2.5 border-t-2 border-zinc-900 flex justify-between items-center text-sm font-extrabold text-zinc-950">
                    <span>Total Amount:</span>
                    <span className="text-base font-black text-zinc-950">
                      {currencySymbol}{orderSuccessData.total.toLocaleString()}
                    </span>
                  </div>

                  {/* Receipt Bottom Branding */}
                  <div className="pt-2 border-t border-dashed border-zinc-300 text-center text-[10px] text-zinc-400">
                    <p className="font-medium">Thank you for your order!</p>
                    <p className="mt-0.5 font-semibold text-zinc-500">Powered by MenuSnap</p>
                  </div>
                </div>

                {/* Actions: Re-open WhatsApp, Download Receipt Image & Reset */}
                <div className="space-y-2 pt-1">
                  {orderSuccessData.whatsappUrl && (
                    <a
                      href={orderSuccessData.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 h-11 text-xs sm:text-sm font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl shadow-md transition-transform active:scale-98"
                    >
                      <span className="text-base">💬</span>
                      <span>Send / Re-open WhatsApp Chat</span>
                    </a>
                  )}

                  <Button
                    type="button"
                    onClick={handleDownloadReceipt}
                    disabled={isDownloading}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold h-10 rounded-xl gap-2 shadow-xs transition-transform active:scale-98"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                    )}
                    <span>{isDownloading ? 'Generating Image...' : 'Download Receipt (Image)'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="w-full border-border font-semibold h-10 rounded-xl"
                  >
                    Done / Place Another Order
                  </Button>
                </div>
              </div>
            ) : (
              /* Review & Form View */
              <>
                {/* Seated Table Card at Top of Modal (Non-editable) */}
                {tableNumber && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground">
                          Table {tableNumber.replace(/^table\s*/i, '').trim()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Ordering via Table QR Stand
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* List of items in cart */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Selected Dishes ({totalItemsCount})</span>
                    <button
                      type="button"
                      onClick={onClearCart}
                      className="text-destructive hover:underline text-[11px] font-semibold"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden bg-muted/20">
                    {cartItems.map((item) => (
                      <div key={item.key} className="p-3 flex items-center justify-between gap-3 bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {decodeHtmlEntities(item.name)}
                          </p>
                          {item.variationName && (
                            <p className="text-[11px] text-muted-foreground font-medium">
                              Variant: {decodeHtmlEntities(item.variationName)}
                            </p>
                          )}
                          <p className="text-xs font-bold text-primary">
                            {currencySymbol}{item.price.toLocaleString()}
                          </p>
                        </div>

                        {/* Stepper & Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 bg-muted p-0.5 rounded-lg border border-border">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.key, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-background text-foreground transition-colors"
                              title="Decrease"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-extrabold w-5 text-center text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.key, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-background text-foreground transition-colors"
                              title="Increase"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.key)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total calculation */}
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Total Bill:</span>
                    <span className="text-base font-extrabold text-primary">
                      {currencySymbol}{totalOrderAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Customer Details Form */}
                <form onSubmit={handlePlaceOrder} className="space-y-3 pt-2 border-t border-border/60">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" /> Your Name *
                    </label>
                    <Input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" /> Phone / WhatsApp Number *
                    </label>
                    <Input
                      required
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  {/* If table is fixed from QR stand, no table input at bottom; only full-width special note */}
                  {tableNumber ? (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Special Note (Optional)
                      </label>
                      <Input
                        value={specialNote}
                        onChange={(e) => setSpecialNote(e.target.value)}
                        placeholder="e.g. Less spicy, extra sauce, etc."
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Table No. (Optional)
                        </label>
                        <Input
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          placeholder="e.g. 4B"
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Special Note (Optional)
                        </label>
                        <Input
                          value={specialNote}
                          onChange={(e) => setSpecialNote(e.target.value)}
                          placeholder="Less spicy, etc."
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-11 text-sm font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl shadow-lg gap-2 transition-transform active:scale-98"
                    >
                      <span className="text-base">💬</span>
                      <span>Place Order via WhatsApp • {currencySymbol}{totalOrderAmount.toLocaleString()}</span>
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground mt-1.5">
                      Submits order and opens WhatsApp with pre-filled message for the restaurant
                    </p>
                  </div>
                </form>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

