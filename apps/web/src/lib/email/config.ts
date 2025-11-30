export const emailConfig = {
  from: process.env.EMAIL_FROM || 'MoveBoss Pro <notifications@movebosspro.com>',
  replyTo: 'support@movebosspro.com',

  // Feature flags - enable/disable email types
  enabled: {
    loadStatusUpdates: true,
    complianceAlerts: true,
    marketplaceActivity: true,
    driverAssignments: true,
    partnershipInvitations: true,
    dailyDigest: false,
    weeklyDigest: false,
  },
};
