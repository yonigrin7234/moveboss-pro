import { baseTemplate, detailsTable, statusBadge, highlight } from './base';

export interface LoadStatusEmailData {
  recipientName: string;
  loadNumber: string;
  status: 'accepted' | 'loading' | 'loaded' | 'in_transit' | 'delivered';
  carrierName?: string;
  companyName?: string;
  origin: string;
  destination: string;
  driverName?: string;
  driverPhone?: string;
  timestamp: string;
  notes?: string;
  viewUrl: string;
}

const statusConfig = {
  accepted: {
    label: 'Accepted',
    type: 'info' as const,
    message: 'Your load has been accepted by a carrier.',
  },
  loading: {
    label: 'Loading',
    type: 'info' as const,
    message: 'The carrier has started loading.',
  },
  loaded: {
    label: 'Loaded',
    type: 'info' as const,
    message: 'Your shipment has been loaded and is ready for transit.',
  },
  in_transit: {
    label: 'In Transit',
    type: 'warning' as const,
    message: 'Your shipment is now in transit.',
  },
  delivered: {
    label: 'Delivered',
    type: 'success' as const,
    message: 'Your shipment has been delivered successfully!',
  },
};

export function loadStatusEmail(data: LoadStatusEmailData): string {
  const config = statusConfig[data.status];

  const details = [
    { label: 'Load Number', value: data.loadNumber },
    { label: 'Route', value: `${data.origin} → ${data.destination}` },
    ...(data.carrierName ? [{ label: 'Carrier', value: data.carrierName }] : []),
    ...(data.companyName ? [{ label: 'Company', value: data.companyName }] : []),
    ...(data.driverName ? [{ label: 'Driver', value: data.driverName }] : []),
    ...(data.driverPhone ? [{ label: 'Driver Phone', value: data.driverPhone }] : []),
    { label: 'Updated', value: new Date(data.timestamp).toLocaleString() },
  ];

  const body = `
    <p>Hi ${data.recipientName},</p>

    <p>${config.message}</p>

    ${highlight(`
      <strong>Status:</strong> ${statusBadge(config.label, config.type)}
    `)}

    ${detailsTable(details)}

    ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
  `;

  return baseTemplate({
    previewText: `Load ${data.loadNumber} is now ${config.label}`,
    title: `Load Update: ${config.label}`,
    body,
    ctaText: 'View Load Details',
    ctaUrl: data.viewUrl,
  });
}
