'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  onExportCSV?: () => Promise<void> | void;
  onExportPDF?: () => Promise<void> | void;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
}

export function ExportButton({
  onExportCSV,
  onExportPDF,
  disabled = false,
  size = 'sm',
  variant = 'outline',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      if (type === 'csv' && onExportCSV) {
        await onExportCSV();
      } else if (type === 'pdf' && onExportPDF) {
        await onExportPDF();
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // If only one export type, show simple button
  if (onExportCSV && !onExportPDF) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport('csv')}
        disabled={disabled || isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Export CSV
      </Button>
    );
  }

  if (onExportPDF && !onExportCSV) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport('pdf')}
        disabled={disabled || isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Export PDF
      </Button>
    );
  }

  // Both types available - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled || isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportCSV && (
          <DropdownMenuItem onClick={() => handleExport('csv')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
        )}
        {onExportPDF && (
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
