"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Crown,
  Sparkles,
  QrCode,
  Share2,
  Copy,
  Check,
  Calendar,
  Percent,
  ShieldCheck,
  Phone,
  RotateCw,
  Wifi,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DigitalMembershipCardProps {
  businessName: string;
  businessType?: 'restaurant' | 'parlour';
  customerName: string;
  customerPhone?: string;
  cardNumber: string;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'VIP';
  discountPercent: number;
  issuedAt: string;
  expiresAt?: string | null;
  customNote?: string;
  className?: string;
}

export function DigitalMembershipCard({
  businessName,
  businessType = 'restaurant',
  customerName,
  customerPhone,
  cardNumber,
  tier,
  discountPercent,
  issuedAt,
  expiresAt,
  customNote,
  className,
}: DigitalMembershipCardProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (cardNumber) {
      QRCode.toDataURL(
        JSON.stringify({
          card: cardNumber,
          name: customerName,
          tier,
          discount: discountPercent,
          store: businessName,
        }),
        {
          width: 160,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        }
      )
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [cardNumber, customerName, tier, discountPercent, businessName]);

  const handleCopyCard = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(cardNumber);
      setCopied(true);
      toast({ title: 'Card Number Copied', description: cardNumber });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const validUntil = expiresAt ? expiresAt : 'Lifetime';
    const redemptionNote = customNote?.trim() || 'Present this card at billing to redeem your exclusive discount.';
    const message = `🎉 *Congratulations ${customerName}!*

You have been issued a *${tier.toUpperCase()} Digital Membership Card* for *${businessName}*!

💳 *Card Number:* ${cardNumber}
🏷️ *Exclusive Privilege:* ${discountPercent}% OFF on all orders
📅 *Valid Thru:* ${validUntil}

${redemptionNote} 🎁`;

    const cleanPhone = (customerPhone || '').replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  // Luxury Card themes per tier (Front & Back)
  const cardThemes = {
    Silver: {
      bg: 'bg-gradient-to-br from-slate-200 via-slate-100 to-slate-400 text-slate-900 border-slate-300 shadow-slate-400/30',
      backBg: 'bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 text-slate-900 border-slate-300',
      pill: 'bg-slate-900 text-white',
      accent: 'text-slate-800',
      label: 'text-slate-600',
      chip: 'from-amber-200 to-yellow-400 border-amber-300',
      stripe: 'bg-slate-800/90',
      panel: 'bg-white/85 text-slate-900 border-slate-300',
    },
    Gold: {
      bg: 'bg-gradient-to-br from-amber-400 via-amber-200 to-yellow-500 text-amber-950 border-amber-300/80 shadow-amber-500/30',
      backBg: 'bg-gradient-to-br from-amber-500 via-amber-300 to-yellow-600 text-amber-950 border-amber-300/80',
      pill: 'bg-amber-950 text-amber-200',
      accent: 'text-amber-900',
      label: 'text-amber-800',
      chip: 'from-yellow-100 to-amber-300 border-yellow-200',
      stripe: 'bg-amber-950/90',
      panel: 'bg-amber-100/95 text-amber-950 border-amber-300',
    },
    Platinum: {
      bg: 'bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-950 text-white border-cyan-500/50 shadow-cyan-950/50',
      backBg: 'bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 text-white border-cyan-500/50',
      pill: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40',
      accent: 'text-cyan-400',
      label: 'text-slate-400',
      chip: 'from-cyan-200 to-teal-400 border-cyan-300',
      stripe: 'bg-slate-950/95',
      panel: 'bg-slate-900/95 text-cyan-200 border-cyan-500/40',
    },
    VIP: {
      bg: 'bg-gradient-to-br from-zinc-950 via-purple-950 to-slate-950 text-white border-purple-500/60 shadow-purple-950/60',
      backBg: 'bg-gradient-to-br from-zinc-950 via-purple-950 to-black text-white border-purple-500/60',
      pill: 'bg-purple-500/25 text-purple-300 border border-purple-400/50',
      accent: 'text-purple-400',
      label: 'text-slate-400',
      chip: 'from-purple-200 to-pink-400 border-purple-300',
      stripe: 'bg-black/95',
      panel: 'bg-purple-950/95 text-purple-200 border-purple-500/50',
    },
  };

  const theme = cardThemes[tier] || cardThemes.Gold;

  return (
    <div className={cn('space-y-3.5 max-w-md mx-auto', className)}>
      {/* 1. 3D Flipping Card Container */}
      <div
        className="w-full aspect-[1.58/1] [perspective:1000px] cursor-pointer group"
        onClick={() => setIsFlipped((prev) => !prev)}
      >
        <div
          className="w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] select-none"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* ==================== FRONT FACE ==================== */}
          <div
            className={cn(
              'absolute inset-0 w-full h-full rounded-3xl p-5 sm:p-6 border shadow-2xl overflow-hidden [backface-visibility:hidden] flex flex-col justify-between select-none',
              theme.bg
            )}
          >
            {/* Decorative holographic shine effect */}
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-black/10 blur-2xl pointer-events-none" />

            {/* Top Row: Business Brand & Tier Badge */}
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Crown className={cn('w-4 h-4', theme.accent)} />
                  <span className="font-black text-sm tracking-tight uppercase truncate max-w-[190px]">
                    {businessName}
                  </span>
                </div>
                <p className={cn('text-[10px] font-medium tracking-wider uppercase', theme.label)}>
                  {businessType === 'parlour' ? 'Exclusive Salon Privilege' : 'Loyalty Member Card'}
                </p>
              </div>

              <div
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1',
                  theme.pill
                )}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {tier}
              </div>
            </div>

            {/* Middle Row: EMV Microchip & Contactless Wave + Discount Banner */}
            <div className="relative z-10 flex items-center justify-between my-auto py-1">
              <div className="flex items-center gap-3">
                {/* Microchip Graphic */}
                <div
                  className={cn(
                    'w-10 h-7 rounded-md bg-gradient-to-tr border shadow-xs flex items-center justify-center relative overflow-hidden',
                    theme.chip
                  )}
                >
                  <div className="w-full h-[1px] bg-black/20 absolute top-2.5" />
                  <div className="w-full h-[1px] bg-black/20 absolute bottom-2.5" />
                  <div className="h-full w-[1px] bg-black/20 absolute left-3.5" />
                  <div className="h-full w-[1px] bg-black/20 absolute right-3.5" />
                </div>

                {/* Contactless Wave */}
                <Wifi className={cn('w-4 h-4 rotate-90 opacity-60', theme.accent)} />
              </div>

              {/* Discount Privilege Pill */}
              <span
                className={cn(
                  'inline-block px-3 py-1 rounded-xl text-xs font-black tracking-tight shadow-xs',
                  theme.pill
                )}
              >
                {discountPercent}% OFF ALL BILLS
              </span>
            </div>

            {/* Bottom Row: Card Details & Flip Hint */}
            <div className="relative z-10 flex items-end justify-between gap-3 pt-1">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm sm:text-base tracking-widest">
                    {cardNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCard}
                    className="opacity-75 hover:opacity-100 transition-opacity p-0.5"
                    title="Copy card number"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <p className="font-bold text-xs uppercase tracking-wide truncate max-w-[210px]">
                  {customerName}
                </p>
              </div>

              {/* Flip Hint Pill */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/15 backdrop-blur-xs text-[10px] font-bold border border-white/20 opacity-80 group-hover:opacity-100 transition-opacity">
                <RotateCw className="w-2.5 h-2.5" />
                <span>Flip for QR</span>
              </div>
            </div>
          </div>

          {/* ==================== BACK FACE ==================== */}
          <div
            className={cn(
              'absolute inset-0 w-full h-full rounded-3xl p-4 sm:p-5 border shadow-2xl overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between select-none',
              theme.backBg || theme.bg
            )}
          >
            {/* Top: Magnetic Stripe */}
            <div className="relative -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 mb-1.5">
              <div className={cn('w-full h-7 sm:h-8 shadow-inner', theme.stripe || 'bg-slate-900')} />
            </div>

            {/* Middle: Signature Strip & Info (Left) + Dynamic QR Code (Right) */}
            <div className="flex items-center justify-between gap-3 my-auto">
              {/* Left Side Info */}
              <div className="space-y-2 flex-1 pr-1">
                {/* Signature Strip */}
                <div className="space-y-0.5">
                  <div
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[10px] font-mono font-bold flex items-center justify-between border shadow-inner',
                      theme.panel
                    )}
                  >
                    <span className="italic font-serif truncate max-w-[130px]">{customerName}</span>
                    <span className="text-[9px] opacity-75 font-mono">CVV {cardNumber.slice(-3)}</span>
                  </div>
                  <span className="text-[8px] uppercase tracking-wider block font-semibold opacity-70">
                    Authorized Member Signature
                  </span>
                </div>

                {/* Phone & Validity */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-[8px] uppercase tracking-wider block opacity-70 font-semibold">
                      Valid Thru
                    </span>
                    <span className="font-mono font-bold block truncate">
                      {expiresAt ? expiresAt : 'LIFETIME'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-wider block opacity-70 font-semibold">
                      Member Phone
                    </span>
                    <span className="font-mono font-bold block truncate">
                      {customerPhone || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Embedded Dynamic QR */}
              {qrDataUrl && (
                <div className="bg-white p-1.5 rounded-2xl shadow-md border border-white/60 shrink-0 text-center">
                  <Image
                    src={qrDataUrl}
                    alt="Member QR"
                    width={64}
                    height={64}
                    className="rounded-lg"
                  />
                  <span className="text-[8px] font-black text-slate-800 tracking-wider uppercase block mt-0.5">
                    Scan to Verify
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Row: Redemption Note & Front Hint */}
            <div className="flex items-center justify-between pt-1 border-t border-black/10 dark:border-white/10 text-[9px] opacity-80">
              <span className="truncate max-w-[240px] italic">
                {customNote || 'Present this card at checkout to redeem.'}
              </span>
              <span className="flex items-center gap-1 font-bold shrink-0">
                <RotateCw className="w-2.5 h-2.5" />
                Front
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Action Controls: Flip Card, WhatsApp Share & Copy (High Contrast Buttons) */}
      <div className="flex items-center gap-2 pt-1">
        {/* Flip Card Button */}
        <Button
          type="button"
          onClick={() => setIsFlipped((prev) => !prev)}
          className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-10 px-3.5 border border-slate-700/80 shadow-xs transition-all"
        >
          <RotateCw className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
          {isFlipped ? 'Show Front' : 'Flip Card'}
        </Button>

        {/* WhatsApp Button */}
        <Button
          type="button"
          onClick={handleShareWhatsApp}
          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm h-10 transition-all"
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          Send to WhatsApp
        </Button>

        {/* Copy Card ID Button (Fixed High Contrast) */}
        <Button
          type="button"
          onClick={handleCopyCard}
          className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-10 px-3.5 border border-slate-700/80 shadow-xs transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              <span>Copy ID</span>
            </>
          )}
        </Button>
      </div>

      {/* Helper text under buttons */}
      <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
        <RotateCw className="w-3 h-3 text-amber-500" />
        <span>Click the card or use <strong>Flip Card</strong> to view QR &amp; membership rules.</span>
      </p>
    </div>
  );
}
