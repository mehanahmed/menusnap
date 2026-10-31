'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarDays,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { decodeHtmlEntities } from '@/lib/utils';
import { getOrderByIdFromMySql, getCategoriesFromMySql } from '@/app/actions/orders';
import { usePreferences } from '@/context/PreferencesContext';
import { useToast } from '@/hooks/use-toast';

// Interfaces
type OrderStatus = "Pending" | "Processing" | "In Progress" | "Shipped" | "Delivered" | "Cancelled" | "Refunded" | "On Hold" | "Out for Delivery";
const ALL_ORDER_STATUSES: OrderStatus[] = ["Pending", "Processing", "In Progress", "Shipped", "Delivered", "Cancelled", "Refunded", "On Hold", "Out for Delivery"];

interface SubItem {
  id?: string;
  name: string;
  price?: number;
}

interface OrderItemDetail {
  id: string;
  name: string;
  quantity: number;
  price: number;
  categoryId: string;
  categoryName?: string;
  description?: string | null;
  subItems?: SubItem[];
}

interface ApiOrder {
  id: string;
  orderId: string;
  orderDate: string;
  status: OrderStatus;
  templateName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  businessName?: string;
  businessRole?: string;
  bio?: string;
  totalAmount?: number;
  items?: OrderItemDetail[];
  templateImageUrl?: string;
  templateDescription?: string;
  templateTags?: string[];
}

const OrderItem = ({ name, description, price, quantity, subItems }: { name: string, description?: string | null, price: number, quantity: number, subItems?: SubItem[] }) => {
  const { currencySymbol, translateText } = usePreferences();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubItems = subItems && subItems.length > 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline gap-4">
        <h3 className="font-bold text-foreground text-base">{translateText(decodeHtmlEntities(name))}</h3>
        {price > 0 && <p className="font-bold text-foreground shrink-0">{currencySymbol}{(price * quantity).toLocaleString()}</p>}
      </div>
      {description && <p className="text-sm text-muted-foreground leading-relaxed">{translateText(decodeHtmlEntities(description))}</p>}

      {hasSubItems && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs h-auto p-1 mt-1 text-primary hover:text-primary/80"
        >
          {isExpanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
          {isExpanded ? 'Hide' : 'Show'} Variations ({subItems.length})
        </Button>
      )}

      {hasSubItems && isExpanded && (
        <div className="mt-2 pl-3 border-l-2 border-primary/20 space-y-1 bg-muted/30 p-2 rounded-r-md">
          {subItems.map((sub, index) => (
            <div key={sub.id || index} className="flex justify-between items-baseline text-xs text-muted-foreground p-1 bg-card rounded">
              <p className="text-foreground/90">{translateText(decodeHtmlEntities(sub.name))}</p>
              {typeof sub.price === 'number' && sub.price > 0 && <p className="font-medium text-primary">+{currencySymbol}{sub.price.toLocaleString()}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Page Component
export default function ShareClient() {
  const params = useParams();
  const orderIdFromUrl = params.id as string;
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const { toast } = useToast();
  const { translateText } = usePreferences();

  useEffect(() => {
    if (!orderIdFromUrl) {
      setError("No selection ID provided in the URL.");
      setIsLoading(false);
      return;
    }

    const fetchOrderAndCategoryDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getCategoriesFromMySql();
        const newCategoryMap = new Map<string, string>();
        if (result.success) {
          (result.data as any[]).forEach((cat: any) => newCategoryMap.set(String(cat.id), cat.name));
        }
        setCategoryMap(newCategoryMap);

        const orderResult = await getOrderByIdFromMySql(orderIdFromUrl);

        if (orderResult.success && orderResult.data) {
          const orderData = orderResult.data;
          const formattedOrder: ApiOrder = {
            id: String(orderData.id),
            orderId: String(orderData.id),
            orderDate: String(orderData.createdAt),
            status: ALL_ORDER_STATUSES.includes(orderData.status) ? orderData.status : "Pending",
            templateName: orderData.template?.name ? String(orderData.template.name) : 'Custom Selection',
            customerName: orderData.customerData?.name,
            customerEmail: orderData.customerData?.email,
            customerPhone: orderData.customerData?.phone,
            customerAddress: orderData.customerData?.address,
            businessName: orderData.customerData?.restaurant,
            businessRole: orderData.customerData?.role,
            totalAmount: parseFloat(orderData.total || 0),
            items: (orderData.items || []).map((item: any, index: number): OrderItemDetail => ({
              id: String(item.id),
              name: String(item.name),
              quantity: Number(item.quantity || 1),
              price: Number(item.price),
              categoryId: String(item.categoryId || `custom-${index}`),
              categoryName: item.categoryName,
              description: item.description || null,
              subItems: Array.isArray(item.subItems) ? item.subItems : [],
            })),
            templateImageUrl: orderData.template?.imageUrl,
          };
          setOrder(formattedOrder);
        } else {
          setError(orderResult.message || `This shared link is invalid or the selection has been removed.`);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load the shared menu selection.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderAndCategoryDetails();
  }, [orderIdFromUrl]);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      let standardized = dateString.replace(' ', 'T');
      if (!standardized.includes('Z') && !standardized.includes('+')) {
        standardized = standardized + 'Z';
      }
      const date = parseISO(standardized);
      if (isValidDate(date)) return format(date, "MMMM d, yyyy");

      const nativeDate = new Date(dateString);
      return isValidDate(nativeDate) ? format(nativeDate, "MMMM d, yyyy") : "Invalid Date";
    } catch {
      const nativeDate = new Date(dateString);
      return isValidDate(nativeDate) ? format(nativeDate, "MMMM d, yyyy") : "Invalid Date";
    }
  };

  const groupedItems = useMemo(() => {
    if (!order?.items) return {};
    return order.items.reduce((acc, item) => {
      const catId = item.categoryId;
      const categoryName = decodeHtmlEntities(item.categoryName) || decodeHtmlEntities(categoryMap.get(catId)) || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(item);
      return acc;
    }, {} as Record<string, OrderItemDetail[]>);
  }, [order?.items, categoryMap]);

  const handleShare = async () => {
    const businessName = decodeHtmlEntities(order?.businessName || 'Client');
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Menu Selection for ${businessName}`,
          text: `Check out the menu selection for ${businessName}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share dismissed
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied!",
          description: "A shareable link is now on your clipboard.",
        });
      } catch {
        toast({
          title: "Error",
          description: "Could not copy link to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-muted min-h-screen p-4 sm:p-8">
        <main className="max-w-5xl mx-auto bg-card p-6 sm:p-12 shadow-2xl rounded-lg space-y-8">
          <div className="flex justify-between items-start border-b pb-8">
            <Skeleton className="h-14 w-1/3" />
            <div className="space-y-2 text-right">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-muted min-h-screen p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-card p-8 rounded-lg shadow-xl border border-destructive/50 max-w-lg">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4 mx-auto" />
          <h2 className="text-xl font-semibold text-destructive mb-2">Could Not Load Selection</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="bg-muted min-h-screen p-2 sm:p-6 lg:p-8">
      {/* Top action bar: Share button only, no print */}
      <header className="max-w-5xl mx-auto flex justify-end gap-2 mb-4 px-2 sm:px-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="bg-card w-full sm:w-auto shadow-sm hover:bg-muted font-medium"
        >
          <Share2 className="h-4 w-4 mr-2" /> Share
        </Button>
      </header>

      {/* Main presentation sheet matching image */}
      <main className="max-w-5xl mx-auto bg-card text-card-foreground p-6 sm:p-12 shadow-2xl rounded-lg bg-watermark border border-border/40 overflow-hidden">
        {/* Header: Logo on left, For + Date on right */}
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start border-b pb-8 mb-6 border-border gap-6">
          <div className="bg-black rounded-lg w-full sm:w-auto px-5 py-2.5 flex items-center justify-center shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]">
            <Image
              src="/menusnap-logo-white.png"
              alt="MenuSnap Logo"
              width={180}
              height={48}
              className="h-9 sm:h-11 w-auto object-contain"
              priority
            />
          </div>
          <div className="text-center sm:text-right text-muted-foreground text-sm space-y-1">
            <p className="font-bold text-lg sm:text-2xl text-foreground">For: {decodeHtmlEntities(order.businessName || 'Client')}</p>
            <p className="flex items-center justify-center sm:justify-end gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatDate(order.orderDate)}
            </p>
          </div>
        </div>

        {/* Selected Items grouped by category with orange headers and 2-column layout */}
        <section>
          {groupedItems && Object.keys(groupedItems).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedItems).map(([categoryName, items]) => (
                <div key={categoryName}>
                  <h3 className="text-xl font-semibold mb-4 border-b-2 border-primary/20 pb-2 text-primary">
                    {translateText(categoryName)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {items.map((item, index) => (
                      <OrderItem
                        key={`${item.id}-${index}`}
                        name={item.name}
                        description={item.description}
                        quantity={item.quantity}
                        price={item.price}
                        subItems={item.subItems}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No items were found in this selection.</p>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center text-muted-foreground text-xs mt-12 pt-8 border-t border-border">
          <p>Menu selection prepared with Color Hut Menu Builder.</p>
          <p>For inquiries, please contact Color Hut at +8801919760626.</p>
        </footer>
      </main>
    </div>
  );
}
