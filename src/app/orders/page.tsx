import { redirect } from 'next/navigation';

export default function OrdersPage() {
  redirect('/orders/shipping/pending');
}