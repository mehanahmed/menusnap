import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCustomerOrderByIdAction } from '@/app/actions/customer-orders';
import OrderReceiptClient from './order-receipt-client';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const res = await getCustomerOrderByIdAction(id);

  if (!res.success || !res.order) {
    return {
      title: 'Order Receipt | MenuSnap',
      description: 'Digital verified restaurant order receipt powered by MenuSnap.',
      robots: { index: false, follow: false },
    };
  }

  const order = res.order;
  const title = `Order #${order.orderId} Receipt — ${order.businessName} | MenuSnap`;
  const description = `Official verified receipt for Order #${order.orderId} at ${order.businessName}. Total: ৳${order.totalAmount.toLocaleString()} (${order.items.length} items).`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'MenuSnap Digital Menu',
    },
  };
}

export default async function OrderReceiptPage({ params }: Props) {
  const { id } = await params;
  const res = await getCustomerOrderByIdAction(id);

  if (!res.success || !res.order) {
    return notFound();
  }

  return <OrderReceiptClient order={res.order} />;
}

