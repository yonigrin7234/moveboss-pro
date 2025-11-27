import { baseTemplate, detailsTable, statusBadge, highlight } from './base';

export interface MarketplaceEmailData {
  recipientName: string;
  eventType:
    | 'new_request'
    | 'request_accepted'
    | 'request_declined'
    | 'load_assigned'
    | 'load_canceled';
  loadNumber: string;
  origin: string;
  destination: string;
  carrierName?: string;
  companyName?: string;
  rate?: number;
  cuft?: number;
  pickupDate?: string;
  declineReason?: string;
  viewUrl: string;
}

const eventConfig = {
  new_request: {
    label: 'New Request',
    type: 'info' as const,
    title: 'New Load Request',
    message: (data: MarketplaceEmailData) =>
      `${data.carrierName || 'A carrier'} has requested your load ${data.loadNumber}.`,
  },
  request_accepted: {
    label: 'Accepted',
    type: 'success' as const,
    title: 'Load Request Accepted',
    message: (data: MarketplaceEmailData) =>
      `Your request for load ${data.loadNumber} has been accepted!`,
  },
  request_declined: {
    label: 'Declined',
    type: 'error' as const,
    title: 'Load Request Declined',
    message: (data: MarketplaceEmailData) =>
      `Your request for load ${data.loadNumber} was declined.`,
  },
  load_assigned: {
    label: 'Assigned',
    type: 'success' as const,
    title: 'Load Assigned to You',
    message: (data: MarketplaceEmailData) =>
      `${data.companyName || 'A company'} has assigned load ${data.loadNumber} to you.`,
  },
  load_canceled: {
    label: 'Canceled',
    type: 'warning' as const,
    title: 'Load Assignment Canceled',
    message: (data: MarketplaceEmailData) =>
      `The assignment for load ${data.loadNumber} has been canceled.`,
  },
};

export function marketplaceEmail(data: MarketplaceEmailData): string {
  const config = eventConfig[data.eventType];

  const details = [
    { label: 'Load Number', value: data.loadNumber },
    { label: 'Route', value: `${data.origin} → ${data.destination}` },
    ...(data.carrierName ? [{ label: 'Carrier', value: data.carrierName }] : []),
    ...(data.companyName ? [{ label: 'Company', value: data.companyName }] : []),
    ...(data.cuft ? [{ label: 'Size', value: `${data.cuft} CUFT` }] : []),
    ...(data.rate ? [{ label: 'Rate', value: `$${data.rate.toFixed(2)}/CUFT` }] : []),
    ...(data.pickupDate
      ? [{ label: 'Pickup Date', value: new Date(data.pickupDate).toLocaleDateString() }]
      : []),
  ];

  const body = `
    <p>Hi ${data.recipientName},</p>

    <p>${config.message(data)}</p>

    ${highlight(`
      <strong>Status:</strong> ${statusBadge(config.label, config.type)}
    `)}

    ${detailsTable(details)}

    ${data.declineReason ? `<p><strong>Reason:</strong> ${data.declineReason}</p>` : ''}
  `;

  return baseTemplate({
    previewText: config.message(data),
    title: config.title,
    body,
    ctaText: 'View Details',
    ctaUrl: data.viewUrl,
  });
}
