'use client';

import { ExportButton } from '@/components/export-button';
import { exportDriversToCSV, exportDriversToPDF, DriverExportData } from '@/hooks/use-export';

interface DriversExportProps {
  drivers: DriverExportData[];
  dateRange: string;
}

export function DriversExport({ drivers, dateRange }: DriversExportProps) {
  const handleExportCSV = () => {
    exportDriversToCSV(drivers, `driver-performance-${Date.now()}`);
  };

  const handleExportPDF = () => {
    exportDriversToPDF(drivers, {
      title: 'Driver Performance Report',
      subtitle: dateRange,
      filename: `driver-performance-${Date.now()}`,
    });
  };

  return <ExportButton onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />;
}
