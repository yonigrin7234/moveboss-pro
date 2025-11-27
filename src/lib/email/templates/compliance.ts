import { baseTemplate, detailsTable, statusBadge, highlight } from './base';

export interface ComplianceAlertEmailData {
  recipientName: string;
  alertType: 'expiring' | 'expired' | 'uploaded' | 'approved' | 'rejected' | 'requested';
  itemName: string;
  documentType: string;
  daysUntilExpiry?: number;
  companyName?: string;
  rejectionReason?: string;
  viewUrl: string;
}

const alertConfig = {
  expiring: {
    label: 'Expiring Soon',
    type: 'warning' as const,
    title: 'Document Expiring Soon',
    message: (data: ComplianceAlertEmailData) =>
      `The ${data.documentType} for ${data.itemName} will expire in ${data.daysUntilExpiry} days.`,
  },
  expired: {
    label: 'Expired',
    type: 'error' as const,
    title: 'Document Expired',
    message: (data: ComplianceAlertEmailData) =>
      `The ${data.documentType} for ${data.itemName} has expired.`,
  },
  uploaded: {
    label: 'Uploaded',
    type: 'info' as const,
    title: 'Document Uploaded',
    message: (data: ComplianceAlertEmailData) =>
      `${data.companyName || 'A carrier'} has uploaded their ${data.documentType}. Please review.`,
  },
  approved: {
    label: 'Approved',
    type: 'success' as const,
    title: 'Document Approved',
    message: (data: ComplianceAlertEmailData) => `Your ${data.documentType} has been approved.`,
  },
  rejected: {
    label: 'Rejected',
    type: 'error' as const,
    title: 'Document Rejected',
    message: (data: ComplianceAlertEmailData) =>
      `Your ${data.documentType} has been rejected.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`,
  },
  requested: {
    label: 'Requested',
    type: 'info' as const,
    title: 'Documents Requested',
    message: (data: ComplianceAlertEmailData) =>
      `${data.companyName || 'A company'} has requested compliance documents from you.`,
  },
};

export function complianceAlertEmail(data: ComplianceAlertEmailData): string {
  const config = alertConfig[data.alertType];

  const details = [
    { label: 'Document', value: data.documentType },
    { label: 'Item', value: data.itemName },
    ...(data.companyName ? [{ label: 'Company', value: data.companyName }] : []),
    ...(data.daysUntilExpiry !== undefined
      ? [{ label: 'Days Remaining', value: data.daysUntilExpiry.toString() }]
      : []),
  ];

  const body = `
    <p>Hi ${data.recipientName},</p>

    <p>${config.message(data)}</p>

    ${highlight(`
      <strong>Status:</strong> ${statusBadge(config.label, config.type)}
    `)}

    ${detailsTable(details)}

    ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ''}

    ${data.alertType === 'rejected' ? '<p>Please upload a new document to continue.</p>' : ''}
  `;

  return baseTemplate({
    previewText: config.message(data),
    title: config.title,
    body,
    ctaText: data.alertType === 'uploaded' ? 'Review Document' : 'View Details',
    ctaUrl: data.viewUrl,
  });
}
