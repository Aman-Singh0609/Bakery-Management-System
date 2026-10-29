import { STATUS_LABELS } from '../lib/format';

const STYLES = {
  PENDING_PAYMENT: 'bg-butter-light text-[#7A5A12] ring-butter/40',
  PAID:            'bg-pistachio-light text-[#4A6326] ring-pistachio/30',
  CONFIRMED:       'bg-pistachio-light text-[#4A6326] ring-pistachio/30',
  PREPARING:       'bg-butter-light text-[#7A5A12] ring-butter/40',
  OUT_FOR_DELIVERY:'bg-box-light text-berry-dark ring-berry/20',
  DELIVERED:       'bg-pistachio text-white ring-pistachio/30',
  CANCELLED:       'bg-[#EFE7E5] text-cocoa-soft ring-line',
  REFUNDED:        'bg-[#EFE7E5] text-cocoa-soft ring-line',
};

const DOTS = {
  PENDING_PAYMENT: 'bg-butter',
  PAID:            'bg-pistachio',
  CONFIRMED:       'bg-pistachio',
  PREPARING:       'bg-butter',
  OUT_FOR_DELIVERY:'bg-berry',
  DELIVERED:       'bg-white',
  CANCELLED:       'bg-cocoa-muted',
  REFUNDED:        'bg-cocoa-muted',
};

export default function StatusBadge({ status }) {
  const active = ['PREPARING', 'OUT_FOR_DELIVERY'].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STYLES[status] || 'bg-line ring-line'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[status] || 'bg-cocoa-muted'} ${active ? 'animate-pulse-dot' : ''}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
