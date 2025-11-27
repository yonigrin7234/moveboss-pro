import { baseTemplate, detailsTable, highlight } from './base';

export interface DriverAssignmentEmailData {
  recipientName: string;
  driverName: string;
  driverPhone?: string;
  loadNumber?: string;
  tripNumber?: string;
  origin: string;
  destination: string;
  pickupDate?: string;
  companyName?: string;
  viewUrl: string;
}

export function driverAssignmentEmail(data: DriverAssignmentEmailData): string {
  const details = [
    ...(data.loadNumber ? [{ label: 'Load Number', value: data.loadNumber }] : []),
    ...(data.tripNumber ? [{ label: 'Trip Number', value: data.tripNumber }] : []),
    { label: 'Route', value: `${data.origin} → ${data.destination}` },
    { label: 'Driver', value: data.driverName },
    ...(data.driverPhone ? [{ label: 'Driver Phone', value: data.driverPhone }] : []),
    ...(data.pickupDate
      ? [{ label: 'Pickup Date', value: new Date(data.pickupDate).toLocaleDateString() }]
      : []),
  ];

  const body = `
    <p>Hi ${data.recipientName},</p>

    <p>A driver has been assigned to your ${data.loadNumber ? 'load' : 'trip'}.</p>

    ${highlight(`
      <strong>Driver:</strong> ${data.driverName}
      ${data.driverPhone ? `<br><strong>Phone:</strong> ${data.driverPhone}` : ''}
    `)}

    ${detailsTable(details)}

    <p>You can contact the driver directly using the phone number above.</p>
  `;

  return baseTemplate({
    previewText: `Driver ${data.driverName} assigned to ${data.loadNumber || data.tripNumber}`,
    title: 'Driver Assigned',
    body,
    ctaText: 'View Details',
    ctaUrl: data.viewUrl,
  });
}
