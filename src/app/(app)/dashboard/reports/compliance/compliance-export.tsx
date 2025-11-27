'use client';

import { ExportButton } from '@/components/export-button';
import {
  exportComplianceToCSV,
  exportComplianceToPDF,
  ComplianceExportData,
} from '@/hooks/use-export';

interface ComplianceExportProps {
  items: ComplianceExportData[];
  summary: {
    valid: number;
    expiring: number;
    expired: number;
    missing: number;
  };
}

export function ComplianceExport({ items, summary }: ComplianceExportProps) {
  const handleExportCSV = () => {
    exportComplianceToCSV(items, `compliance-report-${Date.now()}`);
  };

  const handleExportPDF = () => {
    exportComplianceToPDF(items, {
      title: 'Compliance Report',
      filename: `compliance-report-${Date.now()}`,
      summary: [
        { label: 'Valid Documents', value: summary.valid.toString() },
        { label: 'Expiring Soon', value: summary.expiring.toString() },
        { label: 'Expired', value: summary.expired.toString() },
        { label: 'Missing', value: summary.missing.toString() },
      ],
    });
  };

  return <ExportButton onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />;
}
