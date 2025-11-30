import { baseTemplate, detailsTable, highlight } from './base';

export interface PartnershipInvitationEmailData {
  recipientEmail: string;
  recipientCompanyName?: string;
  senderName: string;
  senderCompanyName: string;
  relationshipType: string;
  message?: string;
  acceptUrl: string;
}

const relationshipLabels: Record<string, string> = {
  gives_loads: 'They will give you loads',
  takes_loads: 'They are looking for loads',
  mutual: 'Mutual partnership',
};

export function partnershipInvitationEmail(data: PartnershipInvitationEmailData): string {
  const greeting = data.recipientCompanyName
    ? `Hi ${data.recipientCompanyName} team,`
    : 'Hi there,';

  const details = [
    { label: 'From Company', value: data.senderCompanyName },
    { label: 'Partnership Type', value: relationshipLabels[data.relationshipType] || data.relationshipType },
  ];

  const body = `
    <p>${greeting}</p>

    <p><strong>${data.senderName}</strong> from <strong>${data.senderCompanyName}</strong> has invited you to become a partner on MoveBoss Pro.</p>

    ${highlight(`
      <strong>What this means:</strong><br/>
      Once you accept, you'll be connected as business partners. This enables seamless load sharing,
      communication, and tracking between your companies.
    `)}

    ${detailsTable(details)}

    ${data.message ? `<p><strong>Message from ${data.senderName}:</strong></p><p style="font-style: italic; color: #666;">"${data.message}"</p>` : ''}

    <p>Click the button below to view and accept this invitation:</p>
  `;

  return baseTemplate({
    previewText: `${data.senderCompanyName} has invited you to partner on MoveBoss Pro`,
    title: 'Partnership Invitation',
    body,
    ctaText: 'View Invitation',
    ctaUrl: data.acceptUrl,
    footer: 'If you did not expect this invitation, you can safely ignore this email.',
  });
}
