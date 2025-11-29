import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFColumn {
  key: string;
  header: string;
  width?: number;
  format?: (value: any) => string;
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: PDFColumn[];
  data: Record<string, any>[];
  orientation?: 'portrait' | 'landscape';
  summary?: { label: string; value: string }[];
  footer?: string;
}

export function generatePDF(options: PDFExportOptions): jsPDF {
  const { title, subtitle, columns, data, orientation = 'portrait', summary, footer } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 20);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(subtitle, margin, 28);
    doc.setTextColor(0);
  }

  // Generated date
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 20, { align: 'right' });
  doc.setTextColor(0);

  let startY = subtitle ? 35 : 30;

  // Summary section
  if (summary && summary.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, startY);
    startY += 6;

    doc.setFont('helvetica', 'normal');
    summary.forEach((item, index) => {
      const y = startY + index * 5;
      doc.text(`${item.label}:`, margin, y);
      doc.text(item.value, margin + 50, y);
    });

    startY += summary.length * 5 + 8;
  }

  // Table
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      if (col.format) {
        return col.format(value);
      }
      if (value === null || value === undefined) {
        return '';
      }
      return String(value);
    })
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: columns.reduce(
      (acc, col, index) => {
        if (col.width) {
          acc[index] = { cellWidth: col.width };
        }
        return acc;
      },
      {} as Record<number, { cellWidth: number }>
    ),
  });

  // Footer
  if (footer) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(footer, margin, doc.internal.pageSize.getHeight() - 10);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(`${filename}.pdf`);
}

// Settlement/Invoice specific PDF
export interface SettlementPDFOptions {
  settlement: {
    trip_number: string;
    driver_name: string;
    company_name: string;
    period_start: string;
    period_end: string;
    total_revenue: number;
    total_expenses: number;
    driver_pay: number;
    net_profit: number;
  };
  loads: {
    load_number: string;
    route: string;
    cuft: number;
    revenue: number;
  }[];
  expenses: {
    type: string;
    description: string;
    amount: number;
  }[];
}

export function generateSettlementPDF(options: SettlementPDFOptions): jsPDF {
  const { settlement, loads, expenses } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Settlement Statement', margin, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(settlement.company_name, margin, 35);

  // Trip info box
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, 42, pageWidth - margin * 2, 25, 'F');

  doc.setFontSize(10);
  doc.text(`Trip: ${settlement.trip_number}`, margin + 4, 50);
  doc.text(`Driver: ${settlement.driver_name}`, margin + 4, 56);
  doc.text(`Period: ${settlement.period_start} - ${settlement.period_end}`, margin + 4, 62);

  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 4, 50, {
    align: 'right',
  });

  let y = 75;

  // Loads section
  if (loads.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Loads', margin, y);
    y += 4;

    autoTable(doc, {
      head: [['Load #', 'Route', 'CUFT', 'Revenue']],
      body: loads.map((load) => [
        load.load_number,
        load.route,
        load.cuft.toString(),
        `$${load.revenue.toFixed(2)}`,
      ]),
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Expenses section
  if (expenses.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Expenses', margin, y);
    y += 4;

    autoTable(doc, {
      head: [['Type', 'Description', 'Amount']],
      body: expenses.map((exp) => [exp.type, exp.description || '-', `$${exp.amount.toFixed(2)}`]),
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Summary section
  doc.setFillColor(41, 128, 185);
  doc.rect(margin, y, pageWidth - margin * 2, 40, 'F');

  doc.setTextColor(255);
  doc.setFontSize(10);

  const col1 = margin + 10;
  const col2 = pageWidth / 2 + 10;

  doc.text('Total Revenue:', col1, y + 10);
  doc.text(`$${settlement.total_revenue.toFixed(2)}`, col1 + 50, y + 10);

  doc.text('Total Expenses:', col1, y + 18);
  doc.text(`$${settlement.total_expenses.toFixed(2)}`, col1 + 50, y + 18);

  doc.text('Driver Pay:', col2, y + 10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${settlement.driver_pay.toFixed(2)}`, col2 + 40, y + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Net Profit:', col2, y + 18);
  doc.text(`$${settlement.net_profit.toFixed(2)}`, col2 + 40, y + 18);

  doc.setTextColor(0);

  return doc;
}
