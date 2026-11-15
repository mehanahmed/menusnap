'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChefHat, 
  Phone, 
  UtensilsCrossed, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Trash2, 
  Download, 
  Loader2, 
  ExternalLink,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  MoreVertical,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  getCustomerOrdersAction, 
  updateCustomerOrderStatusAction, 
  deleteCustomerOrderAction,
  type CustomerOrderRecord 
} from '@/app/actions/customer-orders';
import { toPng } from 'html-to-image';
import { format, parseISO, isValid } from 'date-fns';
import { cn, decodeHtmlEntities } from '@/lib/utils';
import { usePreferences } from '@/context/PreferencesContext';

interface CustomerOrdersTableProps {
  clientId?: number | null;
  businessName?: string | null;
  currencySymbol?: string;
  isParlour?: boolean;
}

type Lang = 'en' | 'bn' | 'ar' | 'es';

const TABLE_I18N = {
  totalOrders: { en: 'Total Orders', bn: 'মোট অর্ডার', ar: 'إجمالي الطلبات', es: 'Total de Pedidos' },
  pendingAction: { en: 'Pending Action', bn: 'পেন্ডিং অর্ডার', ar: 'طلبات معلقة', es: 'Pendiente de Acción' },
  inKitchen: { en: 'In Kitchen', bn: 'রান্নাঘরে', ar: 'في المطبخ', es: 'En Cocina' },
  inService: { en: 'In Service', bn: 'সার্ভিস চলছে', ar: 'قيد الخدمة', es: 'En Servicio' },
  revenue: { en: 'Revenue', bn: 'মোট আয়', ar: 'الإيرادات', es: 'Ingresos' },
  completedShort: { en: 'completed', bn: 'সম্পন্ন', ar: 'مكتمل', es: 'completados' },
  pendingShort: { en: 'pend.', bn: 'পেন্ডিং', ar: 'معلق', es: 'pend.' },

  searchRestaurant: { en: 'Search customer, phone, table...', bn: 'কাস্টমার, ফোন বা টেবিল খুঁজুন...', ar: 'البحث عن العميل، الهاتف، الطاولة...', es: 'Buscar cliente, teléfono, mesa...' },
  searchParlour: { en: 'Search customer, phone, service, note...', bn: 'কাস্টমার, ফোন, সার্ভিস বা নোট খুঁজুন...', ar: 'البحث عن العميل، الهاتف، الخدمة، الملاحظة...', es: 'Buscar cliente, teléfono, servicio, nota...' },

  statusAll: { en: 'All', bn: 'সব', ar: 'الكل', es: 'Todos' },
  statusPending: { en: 'Pending', bn: 'পেন্ডিং', ar: 'معلق', es: 'Pendiente' },
  statusPreparing: { en: 'Preparing', bn: 'রান্না হচ্ছে', ar: 'قيد التحضير', es: 'Preparando' },
  statusInService: { en: 'In Service', bn: 'সার্ভিস চলছে', ar: 'قيد الخدمة', es: 'En Servicio' },
  statusCompleted: { en: 'Completed', bn: 'সম্পন্ন', ar: 'مكتمل', es: 'Completado' },
  statusCancelled: { en: 'Cancelled', bn: 'বাতিল', ar: 'ملغي', es: 'Cancelado' },

  liveSync: { en: 'Live Sync', bn: 'লাইভ সিঙ্ক', ar: 'مزامنة مباشرة', es: 'Sincronización en vivo' },
  syncTooltip: { en: 'Real-time live order sync is active', bn: 'লাইভ অর্ডার সিঙ্ক সক্রিয় রয়েছে', ar: 'مزامنة الطلبات المباشرة نشطة', es: 'Sincronización de pedidos en tiempo real activa' },
  refreshTooltip: { en: 'Manual refresh orders', bn: 'অর্ডার রিফ্রেশ করুন', ar: 'تحديث الطلبات يدوياً', es: 'Actualizar pedidos manualmente' },

  loading: { en: 'Loading customer orders...', bn: 'কাস্টমার অর্ডার লোড হচ্ছে...', ar: 'جارٍ تحميل طلبات العملاء...', es: 'Cargando pedidos de clientes...' },
  noOrdersMatch: { en: 'No orders match your filter', bn: 'কোনো অর্ডার মেলেনি', ar: 'لا توجد طلبات تطابق الفلتر', es: 'Ningún pedido coincide con su filtro' },
  noOrdersYet: { en: 'No customer orders yet', bn: 'এখনও কোনো কাস্টমার অর্ডার নেই', ar: 'لا توجد طلبات عملاء حتى الآن', es: 'Aún no hay pedidos de clientes' },
  clearFilterHint: { en: 'Try clearing your search term or selecting "All" statuses.', bn: 'অন্য কোনো নাম, ফোন বা ফিল্টার দিয়ে চেষ্টা করুন।', ar: 'جرب مسح مصطلح البحث أو تحديد جميع الحالات.', es: 'Pruebe a borrar su término de búsqueda o seleccione "Todos".' },
  firstOrdersRestaurant: { en: 'When guests scan your digital QR menu and place an order, they will appear here in real time.', bn: 'কাস্টমাররা ডিজিটাল কিউআর মেনু স্ক্যান করে অর্ডার করলে তা রিয়েল-টাইমে এখানে দেখা যাবে।', ar: 'عندما يمسح العملاء رمز QR الرقمي ويقدمون طلباً، سيظهر هنا بشكل مباشر.', es: 'Cuando los clientes escaneen su menú digital QR y realicen un pedido, aparecerán aquí en tiempo real.' },
  firstOrdersParlour: { en: 'When clients scan your digital QR card and request services, they will appear here in real time.', bn: 'কাস্টমাররা ডিজিটাল কিউআর কার্ড স্ক্যান করে সার্ভিস বুক করলে তা রিয়েল-টাইমে এখানে দেখা যাবে।', ar: 'عندما يمسح العملاء بطاقة QR الرقمية ويطلبون خدمات، ستظهر هنا فورياً.', es: 'Cuando los clientes escaneen su tarjeta QR digital y soliciten servicios, aparecerán aquí en tiempo real.' },

  thOrderIdTime: { en: 'Order ID / Time', bn: 'অর্ডার আইডি / সময়', ar: 'رقم الطلب / الوقت', es: 'ID del Pedido / Hora' },
  thCustomer: { en: 'Customer', bn: 'কাস্টমার', ar: 'العميل', es: 'Cliente' },
  thTable: { en: 'Table', bn: 'টেবিল', ar: 'الطاولة', es: 'Mesa' },
  thSpecialRequest: { en: 'Special Request / Note', bn: 'বিশেষ অনুরোধ / নোট', ar: 'طلب خاص / ملاحظة', es: 'Petición Especial / Nota' },
  thDishes: { en: 'Dishes', bn: 'খাবারসমূহ', ar: 'الأطباق', es: 'Platos' },
  thServices: { en: 'Services', bn: 'সার্ভিসসমূহ', ar: 'الخدمات', es: 'Servicios' },
  thBill: { en: 'Bill', bn: 'বিল', ar: 'الفاتورة', es: 'Total' },
  thStatus: { en: 'Status', bn: 'স্ট্যাটাস', ar: 'الحالة', es: 'Estado' },
  thActions: { en: 'Actions', bn: 'অ্যাকশন', ar: 'الإجراءات', es: 'Acciones' },

  tableLabel: { en: 'Table', bn: 'টেবিল', ar: 'طاولة', es: 'Mesa' },
  dineIn: { en: 'Dine-in', bn: 'ডাইন-ইন', ar: 'تناول بالداخل', es: 'Para comer aquí' },
  standardBooking: { en: 'Standard Booking', bn: 'স্ট্যান্ডার্ড বুকিং', ar: 'حجز عادي', es: 'Reserva estándar' },
  standardShort: { en: 'Standard', bn: 'স্ট্যান্ডার্ড', ar: 'عادي', es: 'Estándar' },

  viewReceiptImage: { en: 'View Receipt Image', bn: 'রিসিট ছবি দেখুন', ar: 'عرض إيصال الدفع', es: 'Ver Imagen de Recibo' },
  whatsappCustomer: { en: 'WhatsApp Customer', bn: 'হোয়াটসঅ্যাপ করুন', ar: 'مراسلة عبر واتساب', es: 'Contactar por WhatsApp' },
  deleteOrder: { en: 'Delete Order', bn: 'অর্ডার মুছুন', ar: 'حذف الطلب', es: 'Eliminar Pedido' },
  orderActions: { en: 'Order actions', bn: 'অর্ডার অপশন', ar: 'إجراءات الطلب', es: 'Acciones de pedido' },
  viewReceipt: { en: 'View Receipt', bn: 'রিসিট দেখুন', ar: 'عرض الإيصال', es: 'Ver Recibo' },
  noteLabel: { en: 'Note', bn: 'নোট', ar: 'ملاحظة', es: 'Nota' },

  prev: { en: 'Prev', bn: 'আগের', ar: 'السابق', es: 'Ant.' },
  next: { en: 'Next', bn: 'পরের', ar: 'التالي', es: 'Sig.' },
  receiptCustomer: { en: 'Customer Receipt', bn: 'কাস্টমার রিসিট', ar: 'إيصال العميل', es: 'Recibo del Cliente' },
  receiptService: { en: 'Service Booking Receipt', bn: 'সার্ভিস বুকিং রিসিট', ar: 'إيصال حجز الخدمة', es: 'Recibo de Reserva de Servicio' },
  bookingPrefix: { en: 'Booking', bn: 'বুকিং', ar: 'حجز', es: 'Reserva' },
  orderPrefix: { en: 'Order', bn: 'অর্ডার', ar: 'طلب', es: 'Pedido' },
  customerReceiptLabel: { en: 'Customer:', bn: 'কাস্টমার:', ar: 'العميل:', es: 'Cliente:' },
  phoneReceiptLabel: { en: 'Phone:', bn: 'ফোন:', ar: 'الهاتف:', es: 'Teléfono:' },
  tableNoReceiptLabel: { en: 'Table No:', bn: 'টেবিল নং:', ar: 'رقم الطاولة:', es: 'Nº de Mesa:' },
  specialNoteReceiptLabel: { en: 'Preference / Note:', bn: 'অনুরোধ / নোট:', ar: 'الملاحظة / التفضيل:', es: 'Preferencia / Nota:' },
  noteReceiptLabel: { en: 'Note:', bn: 'নোট:', ar: 'ملاحظة:', es: 'Nota:' },
  itemsOrderedReceipt: { en: 'Items Ordered', bn: 'অর্ডারকৃত খাবার', ar: 'الأطباق المطلوبة', es: 'Artículos Pedidos' },
  servicesBookedReceipt: { en: 'Services Booked', bn: 'বুক করা সার্ভিস', ar: 'الخدمات المحجوزة', es: 'Servicios Reservados' },
  totalAmountReceipt: { en: 'Total Amount:', bn: 'মোট বিল:', ar: 'المبلغ الإجمالي:', es: 'Monto Total:' },
  thankYouDining: { en: 'Thank you for dining with us!', bn: 'আমাদের সাথে ডাইন করার জন্য ধন্যবাদ!', ar: 'شكراً لتناولكم الطعام معنا!', es: '¡Gracias por comer con nosotros!' },
  thankYouVisiting: { en: 'Thank you for visiting us!', bn: 'আমাদের সাথে থাকার জন্য ধন্যবাদ!', ar: 'شكراً لزيارتكم لنا!', es: '¡Gracias por visitarnos!' },
  downloadReceiptPng: { en: 'Download Receipt (PNG)', bn: 'রিসিট ডাউনলোড করুন (PNG)', ar: 'تحميل الإيصال (PNG)', es: 'Descargar Recibo (PNG)' },
  generatingImage: { en: 'Generating Image...', bn: 'ছবি তৈরি হচ্ছে...', ar: 'جارٍ إنشاء الصورة...', es: 'Generando imagen...' },
  close: { en: 'Close', bn: 'বন্ধ করুন', ar: 'إغلاق', es: 'Cerrar' },

  totalItemsCount: { en: 'items total', bn: 'টি খাবার মোট', ar: 'أطباق إجمالاً', es: 'artículos en total' },
  totalServicesCount: { en: 'services total', bn: 'টি সার্ভিস মোট', ar: 'خدمات إجمالاً', es: 'servicios en total' },
  deleteConfirmTitle: { en: 'Delete Order', bn: 'অর্ডার মুছবেন?', ar: 'حذف الطلب', es: 'Eliminar Pedido' },
  deleteConfirmDescPrefix: { en: 'Are you sure you want to remove this order for', bn: 'আপনি কি নিশ্চিত যে এই অর্ডারটি মুছে ফেলতে চান -', ar: 'هل أنت متأكد من رغبتك في حذف هذا الطلب لـ', es: '¿Está seguro de que desea eliminar este pedido de' },
  deleteConfirmDescSuffix: { en: '? This action cannot be undone.', bn: '? এই কাজটি আর ফিরিয়ে আনা যাবে না।', ar: '؟ لا يمكن التراجع عن هذا الإجراء.', es: '? Esta acción no se puede deshacer.' },
  cancel: { en: 'Cancel', bn: 'বাতিল', ar: 'إلغاء', es: 'Cancelar' },
  deleting: { en: 'Deleting...', bn: 'মুছে ফেলা হচ্ছে...', ar: 'جارٍ الحذف...', es: 'Eliminando...' },
};

const ITEMS_PER_PAGE = 8;

export function CustomerOrdersTable({
  clientId,
  businessName,
  currencySymbol = '৳',
  isParlour = false,
}: CustomerOrdersTableProps) {
  const { language } = usePreferences();
  const langKey = (language || 'en') as Lang;
  const txt = (key: keyof typeof TABLE_I18N) => TABLE_I18N[key][langKey] || TABLE_I18N[key].en;
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'completed' | 'cancelled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrderRecord | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<CustomerOrderRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptModalRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const playNewOrderChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  };

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;
    if (!isSilent) setIsLoading(true);

    try {
      if (!clientId && !businessName) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      // 1. Fetch from MySQL (scoped strictly to this client)
      const res = await getCustomerOrdersAction({
        clientId: clientId || null,
        businessName: businessName || null,
      });

      let serverOrders: CustomerOrderRecord[] = res.success ? res.orders : [];

      // 2. Also check localStorage for local/client orders, strictly filtered by current client
      let localOrders: CustomerOrderRecord[] = [];
      try {
        const rawLocal = localStorage.getItem('menusnap_customer_orders');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            localOrders = parsed.filter((ord: any) => {
              if (clientId) {
                return ord.clientId && Number(ord.clientId) === Number(clientId);
              }
              if (
                businessName &&
                ord.businessName &&
                String(ord.businessName).trim().toLowerCase() === String(businessName).trim().toLowerCase()
              ) {
                return true;
              }
              return false;
            });
          }
        }
      } catch {}

      // 3. Deduplicate by orderId
      const orderMap = new Map<string, CustomerOrderRecord>();
      serverOrders.forEach((o) => orderMap.set(o.orderId, o));
      localOrders.forEach((o) => {
        if (!orderMap.has(o.orderId)) {
          orderMap.set(o.orderId, o);
        }
      });

      const combined = Array.from(orderMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      // 4. Detect genuinely new incoming orders (not present on initial mount)
      if (!isInitialLoadRef.current) {
        const newOrders = combined.filter((ord) => !knownOrderIdsRef.current.has(ord.orderId));
        if (newOrders.length > 0) {
          playNewOrderChime();
          const newest = newOrders[0];
          toast({
            title: `🔔 New Order Received! (${newOrders.length})`,
            description: `#${newest.orderId} from ${decodeHtmlEntities(newest.customerName)} (${currencySymbol}${newest.totalAmount.toLocaleString()})`,
          });
        }
      } else {
        isInitialLoadRef.current = false;
      }

      // Cache known order IDs
      combined.forEach((ord) => knownOrderIdsRef.current.add(ord.orderId));

      // Bail out if data is identical to avoid unneeded React component re-renders
      setOrders((prev) => {
        if (prev.length === combined.length) {
          const isIdentical = prev.every((oldOrd, idx) => {
            const newOrd = combined[idx];
            return (
              newOrd &&
              oldOrd.orderId === newOrd.orderId &&
              oldOrd.status === newOrd.status &&
              oldOrd.totalAmount === newOrd.totalAmount &&
              oldOrd.customerName === newOrd.customerName &&
              oldOrd.customerPhone === newOrd.customerPhone &&
              oldOrd.tableNumber === newOrd.tableNumber
            );
          });
          if (isIdentical) {
            return prev; // Same reference -> React skips re-rendering completely
          }
        }
        return combined;
      });
    } catch (err) {
      if (!isSilent) {
        console.error('Failed to load customer orders:', err);
        toast({
          title: 'Could not load orders',
          description: 'Failed to retrieve orders from database.',
          variant: 'destructive',
        });
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [clientId, businessName, toast, currencySymbol]);

  useEffect(() => {
    // Initial fetch (shows loading skeleton)
    loadOrders({ silent: false });

    // 1. Polling interval: every 4 seconds when tab is active
    const intervalId = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        loadOrders({ silent: true });
      }
    }, 4000);

    // Immediate refresh when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOrders({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 2. BroadcastChannel: instant 0ms notification across tabs on the same browser
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('menusnap_orders_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'NEW_ORDER') {
            loadOrders({ silent: true });
          }
        };
      } catch (_) {}
    }

    // 3. Storage event listener for cross-tab localStorage sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'menusnap_customer_orders') {
        loadOrders({ silent: true });
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadOrders]);

  // Status updates
  const handleStatusChange = async (orderId: string, newStatus: 'pending' | 'preparing' | 'completed' | 'cancelled') => {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((ord) => (ord.orderId === orderId ? { ...ord, status: newStatus } : ord))
    );
    if (selectedOrder?.orderId === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await updateCustomerOrderStatusAction(orderId, newStatus);
      // Update local storage too
      try {
        const rawLocal = localStorage.getItem('menusnap_customer_orders');
        if (rawLocal) {
          const list = JSON.parse(rawLocal);
          const updated = list.map((o: any) => (o.orderId === orderId ? { ...o, status: newStatus } : o));
          localStorage.setItem('menusnap_customer_orders', JSON.stringify(updated));
        }
      } catch {}
      toast({
        title: 'Status Updated',
        description: `Order #${orderId} marked as ${newStatus}.`,
      });
    } catch {
      toast({
        title: 'Update Failed',
        description: 'Could not update order status in database.',
        variant: 'destructive',
      });
    }
  };

  // Ensure pointer-events and scroll lock are cleanly unlocked when modals close
  useEffect(() => {
    if (!orderToDelete && !selectedOrder && typeof document !== 'undefined') {
      const timer = setTimeout(() => {
        if (document.body.style.pointerEvents === 'none') {
          document.body.style.pointerEvents = '';
        }
        if (document.body.hasAttribute('data-scroll-locked')) {
          document.body.removeAttribute('data-scroll-locked');
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [orderToDelete, selectedOrder]);

  const handleConfirmDelete = async () => {
    if (!orderToDelete || isDeleting) return;
    const orderId = orderToDelete.orderId;
    setIsDeleting(true);

    // Close modal immediately so Radix UI dismisses cleanly before the row unmounts
    setOrderToDelete(null);
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-scroll-locked');
    }

    // Optimistic UI update
    setOrders((prev) => prev.filter((ord) => ord.orderId !== orderId));
    if (selectedOrder?.orderId === orderId) setSelectedOrder(null);

    try {
      await deleteCustomerOrderAction(orderId);
      try {
        const rawLocal = localStorage.getItem('menusnap_customer_orders');
        if (rawLocal) {
          const list = JSON.parse(rawLocal);
          const updated = list.filter((o: any) => o.orderId !== orderId);
          localStorage.setItem('menusnap_customer_orders', JSON.stringify(updated));
        }
      } catch {}
      toast({
        title: 'Order Deleted',
        description: `Order #${orderId} has been removed.`,
      });
    } catch {
      toast({
        title: 'Delete Failed',
        description: 'Could not delete order from database.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = '';
        document.body.removeAttribute('data-scroll-locked');
      }
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptModalRef.current || !selectedOrder) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(receiptModalRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        skipFonts: true,
        backgroundColor: '#FFFFFF',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeId = selectedOrder.orderId.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `receipt-${safeId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({
        title: 'Receipt Downloaded',
        description: `Saved order receipt #${selectedOrder.orderId} as PNG.`,
      });
    } catch (err) {
      console.error('Failed to export receipt:', err);
      toast({
        title: 'Download Failed',
        description: 'Could not generate receipt image.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Filtered & Paginated records
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          (o.tableNumber && o.tableNumber.toLowerCase().includes(q))
      );
    }

    return result;
  }, [orders, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  // Aggregate stats: strictly count Completed orders in Total Revenue
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const preparing = orders.filter((o) => o.status === 'preparing').length;
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const completedCount = completedOrders.length;
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const inProgressRevenue = orders
      .filter((o) => o.status === 'pending' || o.status === 'preparing')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    return { total, pending, preparing, completedCount, totalRevenue, inProgressRevenue };
  }, [orders]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5 shrink-0" /> {txt('statusPending')}
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
            {isParlour ? <Sparkles className="w-3.5 h-3.5 shrink-0 text-pink-500" /> : <ChefHat className="w-3.5 h-3.5 shrink-0" />}
            {isParlour ? txt('statusInService') : txt('statusPreparing')}
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {txt('statusCompleted')}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5 shrink-0" /> {txt('statusCancelled')}
          </span>
        );
      default:
        return <span className="text-[11px] font-semibold capitalize">{status}</span>;
    }
  };

  const formatOrderDate = (dateStr: string) => {
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) return format(parsed, 'MMM d, h:mm a');
      const native = new Date(dateStr);
      return isValid(native) ? format(native, 'MMM d, h:mm a') : dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-3 sm:space-y-5">
      {/* 1. Quick Stats Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full min-w-0 max-w-full">
        <div className="bg-card p-2 sm:p-3 rounded-xl border border-border shadow-xs min-w-0 overflow-hidden">
          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span className="truncate">{txt('totalOrders')}</span>
            <ShoppingBag className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />
          </p>
          <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5 sm:mt-1 truncate">
            {stats.total}
          </p>
        </div>

        <div className="bg-card p-2 sm:p-3 rounded-xl border border-border shadow-xs min-w-0 overflow-hidden">
          <p className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span className="truncate">{txt('pendingAction')}</span>
            <Clock className="w-3.5 h-3.5 shrink-0 ml-1" />
          </p>
          <p className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 truncate">
            {stats.pending}
          </p>
        </div>

        <div className="bg-card p-2 sm:p-3 rounded-xl border border-border shadow-xs min-w-0 overflow-hidden">
          <p className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
            <span className="truncate">
              {isParlour ? txt('inService') : txt('inKitchen')}
            </span>
            {isParlour ? <Sparkles className="w-3.5 h-3.5 shrink-0 ml-1 text-pink-500" /> : <ChefHat className="w-3.5 h-3.5 shrink-0 ml-1" />}
          </p>
          <p className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 truncate">
            {stats.preparing}
          </p>
        </div>

        <div className="bg-card p-2 sm:p-3 rounded-xl border border-border shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span className="truncate">{txt('revenue')}</span>
            {isParlour ? <Sparkles className="w-3.5 h-3.5 shrink-0 ml-1 text-emerald-500" /> : <UtensilsCrossed className="w-3.5 h-3.5 shrink-0 ml-1" />}
          </p>
          <div className="mt-0.5 sm:mt-1 min-w-0">
            <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              {currencySymbol}{stats.totalRevenue.toLocaleString()}
            </p>
            <p className="text-[9.5px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">
              {stats.completedCount} {txt('completedShort')} {stats.inProgressRevenue > 0 && `(+৳${stats.inProgressRevenue.toLocaleString()} ${txt('pendingShort')})`}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col gap-2 bg-card p-2.5 sm:p-3 rounded-2xl border border-border shadow-xs w-full min-w-0 max-w-full overflow-hidden">
        {/* Search */}
        <div className="relative w-full min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isParlour ? txt('searchParlour') : txt('searchRestaurant')}
            className="pl-9 h-9 text-xs sm:text-sm rounded-xl bg-background border-border/80 w-full"
          />
        </div>

        {/* Status Filters + Refresh — clean flex wrap on mobile, no horizontal scroll */}
        <div className="flex flex-wrap items-center gap-1.5 w-full pt-0.5">
          {(['all', 'pending', 'preparing', 'completed', 'cancelled'] as const).map((st) => {
            const count = st === 'all'
              ? orders.length
              : orders.filter((o) => o.status === st).length;

            const getFilterLabel = () => {
              switch (st) {
                case 'all': return txt('statusAll');
                case 'pending': return txt('statusPending');
                case 'preparing': return isParlour ? txt('statusInService') : txt('statusPreparing');
                case 'completed': return txt('statusCompleted');
                case 'cancelled': return txt('statusCancelled');
              }
            };

            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all",
                  statusFilter === st
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{getFilterLabel()}</span>
                <span className={cn(
                  "text-[10px] font-mono px-1 rounded-full",
                  statusFilter === st ? "bg-white/25 text-white" : "bg-background/80 text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Auto-Sync Live Indicator + Manual Refresh */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shadow-2xs select-none"
              title={txt('syncTooltip')}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{txt('liveSync')}</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadOrders({ silent: false })}
              disabled={isLoading}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
              title={txt('refreshTooltip')}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Orders Content (Desktop Table & Mobile Cards) */}
      {isLoading ? (
        <div className="bg-card rounded-2xl border border-border shadow-xs p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground font-medium">
            {txt('loading')}
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-xs p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-foreground">
              {searchQuery || statusFilter !== 'all' ? txt('noOrdersMatch') : txt('noOrdersYet')}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? txt('clearFilterHint')
                : (isParlour ? txt('firstOrdersParlour') : txt('firstOrdersRestaurant'))}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop View: Full Table (md and up) */}
          <div className="hidden md:block bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">{txt('thOrderIdTime')}</th>
                    <th className="py-3 px-4">{txt('thCustomer')}</th>
                    <th className="py-3 px-4">{isParlour ? txt('thSpecialRequest') : txt('thTable')}</th>
                    <th className="py-3 px-4">{isParlour ? txt('thServices') : txt('thDishes')}</th>
                    <th className="py-3 px-4 text-right">{txt('thBill')}</th>
                    <th className="py-3 px-4 text-center">{txt('thStatus')}</th>
                    <th className="py-3 px-4 text-right">{txt('thActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedOrders.map((order) => {
                    const itemCount = order.items.reduce((acc, it) => acc + (it.quantity || 1), 0);
                    const firstItems = order.items.slice(0, 2).map((it) => `${it.quantity}× ${decodeHtmlEntities(it.name)}`).join(', ');
                    const remaining = order.items.length > 2 ? ` (+${order.items.length - 2} more)` : '';

                    return (
                      <tr
                        key={order.orderId}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* Order ID & Time */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/80">
                            #{order.orderId}
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {formatOrderDate(order.createdAt)}
                          </p>
                        </td>

                        {/* Customer Info */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground text-xs">{decodeHtmlEntities(order.customerName)}</p>
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="text-[11px] text-primary hover:underline font-mono flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            {order.customerPhone}
                          </a>
                        </td>

                        {/* Table No. or Parlour Special Request */}
                        <td className="py-3 px-4 max-w-[170px]">
                          {isParlour ? (
                            order.specialNote ? (
                              <p className="text-[11px] font-medium text-foreground truncate" title={order.specialNote}>
                                {decodeHtmlEntities(order.specialNote)}
                              </p>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">
                                {txt('standardBooking')}
                              </span>
                            )
                          ) : order.tableNumber ? (
                            <Badge variant="outline" className="font-bold text-[11px] border-border">
                              {`${txt('tableLabel')} ${order.tableNumber}`}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">
                              {txt('dineIn')}
                            </span>
                          )}
                        </td>

                        {/* Dishes or Services Ordered */}
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-medium text-foreground truncate" title={firstItems + remaining}>
                            {firstItems || (isParlour ? txt('thServices') : txt('thDishes'))}
                            <span className="text-muted-foreground">{remaining}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {itemCount} {isParlour ? txt('totalServicesCount') : txt('totalItemsCount')}
                          </p>
                        </td>

                        {/* Total Bill */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-black text-foreground text-xs sm:text-sm">
                            {currencySymbol}{Number(order.totalAmount || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Live Status Selector */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-block">
                            <Select
                              value={order.status}
                              onValueChange={(val: any) => handleStatusChange(order.orderId, val)}
                            >
                              <SelectTrigger className="h-7 text-[11px] font-bold rounded-lg px-2.5 w-[128px] border-border bg-card justify-between">
                                <SelectValue>{renderStatusBadge(order.status)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent align="center">
                                <SelectItem value="pending" className="text-xs font-semibold">
                                  ⏳ {txt('statusPending')}
                                </SelectItem>
                                <SelectItem value="preparing" className="text-xs font-semibold">
                                  {isParlour ? `✨ ${txt('statusInService')}` : `🍳 ${txt('statusPreparing')}`}
                                </SelectItem>
                                <SelectItem value="completed" className="text-xs font-semibold">
                                  ✅ {txt('statusCompleted')}
                                </SelectItem>
                                <SelectItem value="cancelled" className="text-xs font-semibold text-destructive">
                                  ❌ {txt('statusCancelled')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>

                        {/* Actions: Three Dots Dropdown */}
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                                title={txt('orderActions')}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-lg bg-card border border-border">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setSelectedOrder(order);
                                }}
                                className="cursor-pointer gap-2 py-2 text-xs font-semibold rounded-lg"
                              >
                                <Eye className="w-4 h-4 text-primary" />
                                <span>{txt('viewReceiptImage')}</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onSelect={() => {
                                  const cleanPhone = order.customerPhone.replace(/\D/g, '');
                                  const waPhone = cleanPhone.startsWith('01') ? '88' + cleanPhone : cleanPhone;
                                  if (waPhone) window.open(`https://wa.me/${waPhone}`, '_blank');
                                }}
                                className="cursor-pointer gap-2 py-2 text-xs font-semibold text-emerald-600 focus:text-emerald-600 focus:bg-emerald-500/10 rounded-lg"
                              >
                                <Phone className="w-4 h-4 text-emerald-600" />
                                <span>{txt('whatsappCustomer')}</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="my-1" />

                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setOrderToDelete(order);
                                }}
                                className="cursor-pointer gap-2 py-2 text-xs font-semibold text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                                <span>{txt('deleteOrder')}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View: Distinct Modern Cards (below md) */}
          <div className="md:hidden space-y-3 w-full min-w-0 max-w-full">
            {paginatedOrders.map((order) => {
              const itemCount = order.items.reduce((acc, it) => acc + (it.quantity || 1), 0);
              const firstItems = order.items.slice(0, 3).map((it) => `${it.quantity}× ${decodeHtmlEntities(it.name)}`).join(', ');
              const remaining = order.items.length > 3 ? ` (+${order.items.length - 3} more)` : '';

              return (
                <div
                  key={order.orderId}
                  className="bg-card rounded-2xl border border-border shadow-xs p-3 sm:p-3.5 space-y-2.5 sm:space-y-3 transition-shadow w-full min-w-0 max-w-full overflow-hidden"
                >
                  {/* Top Row: Order ID + Date + Status Select */}
                  <div className="flex items-center justify-between gap-2 w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded-md border border-border shrink-0">
                        #{order.orderId}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                        <Calendar className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{formatOrderDate(order.createdAt)}</span>
                      </span>
                    </div>

                    {/* Status Dropdown */}
                    <Select
                      value={order.status}
                      onValueChange={(val: any) => handleStatusChange(order.orderId, val)}
                    >
                      <SelectTrigger className="h-7 text-[11px] font-bold rounded-lg px-2 w-[114px] border-border bg-card justify-between shrink-0">
                        <SelectValue>{renderStatusBadge(order.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="pending" className="text-xs font-semibold">
                          ⏳ {txt('statusPending')}
                        </SelectItem>
                        <SelectItem value="preparing" className="text-xs font-semibold">
                          {isParlour ? `✨ ${txt('statusInService')}` : `🍳 ${txt('statusPreparing')}`}
                        </SelectItem>
                        <SelectItem value="completed" className="text-xs font-semibold">
                          ✅ {txt('statusCompleted')}
                        </SelectItem>
                        <SelectItem value="cancelled" className="text-xs font-semibold text-destructive">
                          ❌ {txt('statusCancelled')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Customer & Table Row */}
                  <div className="flex items-center justify-between text-xs gap-2 pt-0.5 border-t border-border/40 w-full min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground text-xs truncate">
                        {decodeHtmlEntities(order.customerName)}
                      </p>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="text-[11px] text-primary hover:underline font-mono flex items-center gap-1 mt-0.5 truncate"
                      >
                        <Phone className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{order.customerPhone}</span>
                      </a>
                    </div>

                    <div className="text-right shrink-0 max-w-[130px]">
                      {isParlour ? (
                        order.specialNote ? (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate block max-w-[120px]">
                            {decodeHtmlEntities(order.specialNote)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-[10px]">
                            {txt('standardShort')}
                          </span>
                        )
                      ) : order.tableNumber ? (
                        <Badge variant="outline" className="font-bold text-[10px] border-border bg-muted/40 px-2 py-0.5">
                          {`${txt('tableLabel')} ${order.tableNumber}`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">
                          {txt('dineIn')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dishes Summary */}
                  <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50 text-xs space-y-1 w-full min-w-0 overflow-hidden">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider shrink-0">
                        {`${isParlour ? txt('thServices') : txt('thDishes')} (${itemCount}):`}
                      </span>
                      <span className="font-black text-sm text-foreground shrink-0">
                        {currencySymbol}{Number(order.totalAmount || 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground font-medium line-clamp-2 break-words">
                      {firstItems}{remaining}
                    </p>
                    {order.specialNote && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium italic pt-1 border-t border-border/40 mt-1 line-clamp-1 truncate">
                        {txt('noteLabel')}: {decodeHtmlEntities(order.specialNote)}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons for Mobile */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 w-full min-w-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                      className="flex-1 h-8 text-xs font-bold rounded-xl gap-1.5 border-border bg-card hover:bg-muted min-w-0"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{txt('viewReceipt')}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOrderToDelete(order)}
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                      title={txt('deleteOrder')}
                    >
                      <Trash2 className="w-4 h-4 text-destructive/80 hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Pagination (Shared for Desktop & Mobile) */}
          {filteredOrders.length > 0 && (
            <div className="bg-card rounded-2xl border border-border shadow-xs px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-muted-foreground w-full min-w-0 max-w-full overflow-hidden">
              <p className="text-[11px] sm:text-xs">
                {langKey === 'bn' ? (
                  <>
                    <span className="font-bold text-foreground">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{' '}
                    থেকে{' '}
                    <span className="font-bold text-foreground">
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}
                    </span>{' '}
                    (মোট <span className="font-bold text-foreground">{filteredOrders.length}</span> টি অর্ডার)
                  </>
                ) : langKey === 'ar' ? (
                  <>
                    عرض{' '}
                    <span className="font-bold text-foreground">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{' '}
                    إلى{' '}
                    <span className="font-bold text-foreground">
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}
                    </span>{' '}
                    من أصل <span className="font-bold text-foreground">{filteredOrders.length}</span> طلب
                  </>
                ) : langKey === 'es' ? (
                  <>
                    Mostrando{' '}
                    <span className="font-bold text-foreground">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-bold text-foreground">
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}
                    </span>{' '}
                    de <span className="font-bold text-foreground">{filteredOrders.length}</span> pedidos
                  </>
                ) : (
                  <>
                    Showing{' '}
                    <span className="font-bold text-foreground">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-bold text-foreground">
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}
                    </span>{' '}
                    of <span className="font-bold text-foreground">{filteredOrders.length}</span> orders
                  </>
                )}
              </p>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 text-xs rounded-lg"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> {txt('prev')}
                </Button>

                <span className="px-2 font-bold text-foreground text-xs">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 text-xs rounded-lg"
                >
                  {txt('next')} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 5. Detailed Receipt Modal for Restaurant View & Print */}
      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            if (typeof document !== 'undefined') {
              document.body.style.pointerEvents = '';
              document.body.removeAttribute('data-scroll-locked');
            }
          }
        }}
      >
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (typeof document !== 'undefined') {
              document.body.style.pointerEvents = '';
              document.body.removeAttribute('data-scroll-locked');
            }
          }}
          className="max-w-md w-[94vw] p-0 overflow-hidden rounded-2xl bg-card border border-border shadow-2xl max-h-[92vh] flex flex-col [&>button.absolute]:hidden"
        >
          {selectedOrder && (
            <>
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
                <div>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    {isParlour ? (
                      <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
                    ) : (
                      <UtensilsCrossed className="w-4 h-4 text-primary shrink-0" />
                    )}
                    {isParlour ? txt('bookingPrefix') : txt('orderPrefix')} #{selectedOrder.orderId}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {formatOrderDate(selectedOrder.createdAt)}
                  </DialogDescription>
                </div>
                {renderStatusBadge(selectedOrder.status)}
              </div>

              {/* Body: High-Contrast POS Receipt Card */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div
                  ref={receiptModalRef}
                  className="bg-white text-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm text-left space-y-3 font-sans"
                >
                  {/* Top Business & Order Header */}
                  <div className="text-center pb-3 border-b border-dashed border-zinc-300 space-y-0.5">
                    <p className="font-black text-sm sm:text-base tracking-tight text-zinc-950 uppercase">
                      {selectedOrder.businessName || businessName || (isParlour ? 'Salon Service Booking' : 'Menu Order')}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {isParlour ? txt('receiptService') : txt('receiptCustomer')}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1 text-[11px]">
                      <span className="font-mono font-bold bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-zinc-200">
                        #{selectedOrder.orderId}
                      </span>
                      <span className="text-zinc-500 font-medium">
                        {formatOrderDate(selectedOrder.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="text-xs space-y-1 py-1.5 border-b border-dashed border-zinc-300 text-zinc-700">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">{txt('customerReceiptLabel')}</span>
                      <span className="font-bold text-zinc-900">{decodeHtmlEntities(selectedOrder.customerName)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">{txt('phoneReceiptLabel')}</span>
                      <span className="font-semibold text-zinc-900 font-mono">{selectedOrder.customerPhone}</span>
                    </div>
                    {!isParlour && selectedOrder.tableNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-medium">{txt('tableNoReceiptLabel')}</span>
                        <span className="font-bold text-zinc-900">{selectedOrder.tableNumber}</span>
                      </div>
                    )}
                    {selectedOrder.specialNote && (
                      <div className="flex justify-between items-start gap-2 pt-0.5">
                        <span className="text-zinc-500 font-medium shrink-0">
                          {isParlour ? txt('specialNoteReceiptLabel') : txt('noteReceiptLabel')}
                        </span>
                        <span className="font-medium text-zinc-800 text-right italic text-[11px]">
                          {decodeHtmlEntities(selectedOrder.specialNote)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ordered Items List */}
                  <div className="space-y-1.5 py-1">
                    <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                      {isParlour ? txt('servicesBookedReceipt') : txt('itemsOrderedReceipt')} ({selectedOrder.items.reduce((s, it) => s + (it.quantity || 1), 0)}):
                    </p>
                    <div className="divide-y divide-zinc-100">
                      {selectedOrder.items.map((item) => (
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
                    <span>{txt('totalAmountReceipt')}</span>
                    <span className="text-base font-black text-zinc-950">
                      {currencySymbol}{Number(selectedOrder.totalAmount).toLocaleString()}
                    </span>
                  </div>

                  {/* Receipt Bottom Branding */}
                  <div className="pt-2 border-t border-dashed border-zinc-300 text-center text-[10px] text-zinc-400">
                    <p className="font-medium">
                      {isParlour ? txt('thankYouVisiting') : txt('thankYouDining')}
                    </p>
                    <p className="mt-0.5 font-semibold text-zinc-500">Powered by MenuSnap</p>
                  </div>
                </div>

                {/* Actions: Download Receipt & Close */}
                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleDownloadReceipt}
                    disabled={isDownloading}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold h-10 rounded-xl gap-2 shadow-md transition-transform active:scale-98"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                    )}
                    <span>{isDownloading ? txt('generatingImage') : txt('downloadReceiptPng')}</span>
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const cleanPhone = selectedOrder.customerPhone.replace(/\D/g, '');
                        if (cleanPhone) {
                          window.open(`https://wa.me/${cleanPhone}`, '_blank');
                        }
                      }}
                      className="text-xs font-semibold gap-1.5 h-9 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Phone className="w-3.5 h-3.5" /> {txt('whatsappCustomer')}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setSelectedOrder(null)}
                      className="text-xs font-semibold h-9 rounded-xl"
                    >
                      {txt('close')}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Delete Order Confirmation Modal */}
      <AlertDialog
        open={Boolean(orderToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setOrderToDelete(null);
            if (typeof document !== 'undefined') {
              document.body.style.pointerEvents = '';
              document.body.removeAttribute('data-scroll-locked');
            }
          }
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (typeof document !== 'undefined') {
              document.body.style.pointerEvents = '';
              document.body.removeAttribute('data-scroll-locked');
            }
          }}
          className="max-w-sm w-[92vw] rounded-2xl p-5 border border-border shadow-2xl bg-card"
        >
          <AlertDialogHeader className="space-y-2 text-left">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              {txt('deleteConfirmTitle')} #{orderToDelete?.orderId}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {txt('deleteConfirmDescPrefix')}{' '}
              <span className="font-bold text-foreground">
                {orderToDelete ? decodeHtmlEntities(orderToDelete.customerName) : 'Customer'}
              </span>{' '}
              ({currencySymbol}{Number(orderToDelete?.totalAmount || 0).toLocaleString()}){txt('deleteConfirmDescSuffix')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-3 sm:space-x-0">
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => {
                setOrderToDelete(null);
                if (typeof document !== 'undefined') {
                  document.body.style.pointerEvents = '';
                  document.body.removeAttribute('data-scroll-locked');
                }
              }}
              className="mt-0 h-9 rounded-xl text-xs font-semibold flex-1 sm:flex-none border-border"
            >
              {txt('cancel')}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="h-9 rounded-xl text-xs font-bold gap-1.5 flex-1 sm:flex-none shadow-sm"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{isDeleting ? txt('deleting') : txt('deleteOrder')}</span>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Bottom Navigation Clearance Spacer */}
      <div className="h-10 md:hidden pointer-events-none" aria-hidden="true" />
    </div>
  );
}

