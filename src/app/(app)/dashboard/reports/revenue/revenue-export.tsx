'use client';

import { ExportButton } from '@/components/export-button';
import { exportRevenueToCSV, exportRevenueToPDF, RevenueExportData } from '@/hooks/use-export';

interface RevenueExportProps {
  data: RevenueExportData[];
  totals: {
    revenue: number;
    loads: number;
    cuft: number;
  };
  dateRange: string;
}

export function RevenueExport({ data, totals, dateRange }: RevenueExportProps) {
  const handleExportCSV = () => {
    exportRevenueToCSV(data, `revenue-report-${Date.now()}`);
  };

  const handleExportPDF = () => {
    exportRevenueToPDF(data, {
      title: 'Revenue Report',
      subtitle: dateRange,
      filename: `revenue-report-${Date.now()}`,
      summary: [
        { label: 'Total Revenue', value: `$${totals.revenue.toLocaleString()}` },
        { label: 'Total Loads', value: totals.loads.toString() },
        { label: 'Total CUFT', value: totals.cuft.toLocaleString() },
      ],
    });
  };

  return <ExportButton onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />;
}
