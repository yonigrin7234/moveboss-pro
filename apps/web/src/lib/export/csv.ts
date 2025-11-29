import Papa from 'papaparse';

export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any) => string;
}

export function generateCSV(data: Record<string, any>[], columns: ExportColumn[]): string {
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

  return Papa.unparse({
    fields: headers,
    data: rows,
  });
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// Format helpers
export const formatters = {
  currency: (value: number | null) => (value !== null ? `$${value.toFixed(2)}` : ''),

  date: (value: string | null) => (value ? new Date(value).toLocaleDateString() : ''),

  datetime: (value: string | null) => (value ? new Date(value).toLocaleString() : ''),

  percent: (value: number | null) => (value !== null ? `${value.toFixed(1)}%` : ''),

  number: (value: number | null) => (value !== null ? value.toLocaleString() : ''),
};
