export interface EmailTemplateData {
  previewText?: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}

export function baseTemplate(data: EmailTemplateData): string {
  const { previewText, title, body, ctaText, ctaUrl, footer } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${previewText ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</span>` : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 32px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #eeeeee;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    h1 {
      color: #1a1a1a;
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    .content {
      font-size: 16px;
      color: #4a4a4a;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 24px 0;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #888888;
      padding-top: 20px;
      border-top: 1px solid #eeeeee;
      margin-top: 24px;
    }
    .highlight {
      background-color: #f0f9ff;
      border-left: 4px solid #2563eb;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    .status-success { background-color: #d1fae5; color: #065f46; }
    .status-warning { background-color: #fef3c7; color: #92400e; }
    .status-error { background-color: #fee2e2; color: #991b1b; }
    .status-info { background-color: #dbeafe; color: #1e40af; }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .details-table td {
      padding: 8px 0;
      border-bottom: 1px solid #eeeeee;
    }
    .details-table td:first-child {
      color: #888888;
      width: 40%;
    }
    .details-table td:last-child {
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">MoveBoss Pro</div>
      </div>

      <h1>${title}</h1>

      <div class="content">
        ${body}
      </div>

      ${
        ctaText && ctaUrl
          ? `
        <div style="text-align: center;">
          <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
        </div>
      `
          : ''
      }

      <div class="footer">
        ${footer || 'You received this email because you have an account with MoveBoss Pro.'}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Helper to create details table
export function detailsTable(items: { label: string; value: string }[]): string {
  return `
    <table class="details-table">
      ${items
        .map(
          (item) => `
        <tr>
          <td>${item.label}</td>
          <td>${item.value}</td>
        </tr>
      `
        )
        .join('')}
    </table>
  `;
}

// Helper for status badges
export function statusBadge(text: string, type: 'success' | 'warning' | 'error' | 'info'): string {
  return `<span class="status-badge status-${type}">${text}</span>`;
}

// Helper for highlighted sections
export function highlight(content: string): string {
  return `<div class="highlight">${content}</div>`;
}
