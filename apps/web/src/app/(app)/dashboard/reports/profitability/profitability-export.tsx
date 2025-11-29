'use client';

import { ExportButton } from '@/components/export-button';
import {
  exportProfitabilityToCSV,
  exportProfitabilityToPDF,
  ProfitabilityExportData,
} from '@/hooks/use-export';

interface ProfitabilityExportProps {
  trips: ProfitabilityExportData[];
  summary: {
    total_trips: number;
    total_revenue: number;
    total_costs: number;
    total_driver_pay: number;
    total_net_profit: number;
    avg_margin: number;
  };
  dateRange: string;
}

export function ProfitabilityExport({ trips, summary, dateRange }: ProfitabilityExportProps) {
  const handleExportCSV = () => {
    exportProfitabilityToCSV(trips, `profitability-report-${Date.now()}`);
  };

  const handleExportPDF = () => {
    exportProfitabilityToPDF(trips, {
      title: 'Trip Profitability Report',
      subtitle: dateRange,
      filename: `profitability-report-${Date.now()}`,
      summary: [
        { label: 'Total Trips', value: summary.total_trips.toString() },
        { label: 'Total Revenue', value: `$${summary.total_revenue.toLocaleString()}` },
        { label: 'Total Costs', value: `$${summary.total_costs.toLocaleString()}` },
        { label: 'Driver Pay', value: `$${summary.total_driver_pay.toLocaleString()}` },
        { label: 'Net Profit', value: `$${summary.total_net_profit.toLocaleString()}` },
        { label: 'Avg Margin', value: `${summary.avg_margin.toFixed(1)}%` },
      ],
    });
  };

  return <ExportButton onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />;
}
