// WhatsApp click-to-chat helpers. Opening WhatsApp creates a DRAFT on the
// customer's phone — it is never proof that the message was sent, the order
// accepted, or anything paid. Browser-safe.
import { formatMoney } from './money.js';

export function waNumber(e164) {
  return String(e164 || '').replace(/[^\d]/g, '');
}

export function waLink(e164, text) {
  const n = waNumber(e164);
  if (!/^\d{8,15}$/.test(n)) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/**
 * Readable order summary. order: { ref, items:[{name, qty, options[], note}], fulfillmentType,
 * scheduledLabel, totals:{subtotal, discount, deliveryFee, total}, currency, paymentLabel, address? }
 */
export function orderMessage(order, lang) {
  const ar = lang === 'ar';
  const m = (v) => formatMoney(v, order.currency, lang);
  const lines = [];
  lines.push(ar ? `طلب جديد من الموقع — رقم ${order.ref}` : `Website order ${order.ref}`);
  lines.push('');
  for (const it of order.items) {
    lines.push(`${it.qty} × ${it.name}`);
    if (it.options?.length) lines.push(`   ${it.options.join('، ')}`);
    if (it.note) lines.push(`   ${ar ? 'ملاحظة' : 'Note'}: ${it.note}`);
  }
  lines.push('');
  lines.push(`${ar ? 'الاستلام' : 'Fulfilment'}: ${order.fulfillmentType === 'delivery' ? (ar ? 'توصيل' : 'Delivery') : (ar ? 'استلام من المطعم' : 'Pickup')}${order.scheduledLabel ? ` — ${order.scheduledLabel}` : ''}`);
  if (order.address) lines.push(`${ar ? 'العنوان' : 'Address'}: ${order.address}`);
  if (order.totals.discount) lines.push(`${ar ? 'الخصم' : 'Discount'}: −${m(order.totals.discount)}`);
  if (order.totals.deliveryFee) lines.push(`${ar ? 'التوصيل' : 'Delivery'}: ${m(order.totals.deliveryFee)}`);
  lines.push(`${ar ? 'الإجمالي' : 'Total'}: ${m(order.totals.total)}`);
  if (order.paymentLabel) lines.push(`${ar ? 'الدفع' : 'Payment'}: ${order.paymentLabel}`);
  return lines.join('\n');
}
