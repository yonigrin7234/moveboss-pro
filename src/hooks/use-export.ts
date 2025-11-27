'use client';

import { generateCSV, downloadCSV, formatters, ExportColumn } from '@/lib/export/csv';
import { generatePDF, downloadPDF, PDFColumn } from '@/lib/export/pdf';

// ============================================
// LOADS EXPORT
// ============================================

export interface LoadExportData {
  load_number: string;
  company_name?: string;
  origin: string;
  destination: string;
  status: string;
  cuft: number;
  rate: number;
  revenue: number;
  pickup_date?: string;
  delivery_date?: string;
  driver_name?: string;
}

const loadColumns: ExportColumn[] = [
  { key: 'load_number', header: 'Load #' },
  { key: 'company_name', header: 'Company' },
  { key: 'origin', header: 'Origin' },
  { key: 'destination', header: 'Destination' },
  { key: 'status', header: 'Status' },
  { key: 'cuft', header: 'CUFT', format: formatters.number },
  { key: 'rate', header: 'Rate', format: formatters.currency },
  { key: 'revenue', header: 'Revenue', format: formatters.currency },
  { key: 'pickup_date', header: 'Pickup Date', format: formatters.date },
  { key: 'delivery_date', header: 'Delivery Date', format: formatters.date },
  { key: 'driver_name', header: 'Driver' },
];

export function exportLoadsToCSV(loads: LoadExportData[], filename: string = 'loads') {
  const csv = generateCSV(loads, loadColumns);
  downloadCSV(csv, filename);
}

export function exportLoadsToPDF(
  loads: LoadExportData[],
  options: { title?: string; filename?: string; subtitle?: string } = {}
) {
  const pdfColumns: PDFColumn[] = loadColumns.map((col) => ({
    key: col.key,
    header: col.header,
    format: col.format,
  }));

  const doc = generatePDF({
    title: options.title || 'Loads Report',
    subtitle: options.subtitle,
    filename: options.filename || 'loads-report',
    columns: pdfColumns,
    data: loads,
    orientation: 'landscape',
    footer: 'MoveBoss Pro',
  });

  downloadPDF(doc, options.filename || 'loads-report');
}

// ============================================
// TRIPS EXPORT
// ============================================

export interface TripExportData {
  trip_number: string;
  route: string;
  status: string;
  driver_name?: string;
  scheduled_date?: string;
  completed_date?: string;
  total_miles?: number;
  total_cuft: number;
  revenue: number;
  costs: number;
  driver_pay: number;
  net_profit: number;
  margin: number;
}

const tripColumns: ExportColumn[] = [
  { key: 'trip_number', header: 'Trip #' },
  { key: 'route', header: 'Route' },
  { key: 'status', header: 'Status' },
  { key: 'driver_name', header: 'Driver' },
  { key: 'scheduled_date', header: 'Date', format: formatters.date },
  { key: 'total_miles', header: 'Miles', format: formatters.number },
  { key: 'total_cuft', header: 'CUFT', format: formatters.number },
  { key: 'revenue', header: 'Revenue', format: formatters.currency },
  { key: 'costs', header: 'Costs', format: formatters.currency },
  { key: 'driver_pay', header: 'Driver Pay', format: formatters.currency },
  { key: 'net_profit', header: 'Net Profit', format: formatters.currency },
  { key: 'margin', header: 'Margin', format: formatters.percent },
];

export function exportTripsToCSV(trips: TripExportData[], filename: string = 'trips') {
  const csv = generateCSV(trips, tripColumns);
  downloadCSV(csv, filename);
}

// ============================================
// PROFITABILITY EXPORT
// ============================================

export interface ProfitabilityExportData {
  trip_number: string;
  route: string;
  total_revenue: number;
  total_costs: number;
  driver_pay: number;
  net_profit: number;
  profit_margin: number;
  revenue_per_mile: number;
}

const profitabilityColumns: ExportColumn[] = [
  { key: 'trip_number', header: 'Trip #' },
  { key: 'route', header: 'Route' },
  { key: 'total_revenue', header: 'Revenue', format: formatters.currency },
  { key: 'total_costs', header: 'Costs', format: formatters.currency },
  { key: 'driver_pay', header: 'Driver Pay', format: formatters.currency },
  { key: 'net_profit', header: 'Net Profit', format: formatters.currency },
  { key: 'profit_margin', header: 'Margin', format: formatters.percent },
  { key: 'revenue_per_mile', header: '$/Mile', format: formatters.currency },
];

export function exportProfitabilityToCSV(
  data: ProfitabilityExportData[],
  filename: string = 'profitability'
) {
  const csv = generateCSV(data, profitabilityColumns);
  downloadCSV(csv, filename);
}

export function exportProfitabilityToPDF(
  data: ProfitabilityExportData[],
  options: {
    title?: string;
    filename?: string;
    subtitle?: string;
    summary?: { label: string; value: string }[];
  } = {}
) {
  const pdfColumns: PDFColumn[] = profitabilityColumns.map((col) => ({
    key: col.key,
    header: col.header,
    format: col.format,
  }));

  const doc = generatePDF({
    title: options.title || 'Trip Profitability Report',
    subtitle: options.subtitle,
    filename: options.filename || 'profitability-report',
    columns: pdfColumns,
    data,
    orientation: 'landscape',
    summary: options.summary,
    footer: 'MoveBoss Pro',
  });

  downloadPDF(doc, options.filename || 'profitability-report');
}

export function exportTripsToPDF(
  trips: TripExportData[],
  options: {
    title?: string;
    filename?: string;
    subtitle?: string;
    summary?: { label: string; value: string }[];
  } = {}
) {
  const pdfColumns: PDFColumn[] = tripColumns.map((col) => ({
    key: col.key,
    header: col.header,
    format: col.format,
  }));

  const doc = generatePDF({
    title: options.title || 'Trips Report',
    subtitle: options.subtitle,
    filename: options.filename || 'trips-report',
    columns: pdfColumns,
    data: trips,
    orientation: 'landscape',
    summary: options.summary,
    footer: 'MoveBoss Pro',
  });

  downloadPDF(doc, options.filename || 'trips-report');
}

// ============================================
// REVENUE EXPORT
// ============================================

export interface RevenueExportData {
  period: string;
  total_revenue: number;
  load_count: number;
  total_cuft: number;
}

const revenueColumns: ExportColumn[] = [
  { key: 'period', header: 'Period' },
  { key: 'total_revenue', header: 'Revenue', format: formatters.currency },
  { key: 'load_count', header: 'Loads', format: formatters.number },
  { key: 'total_cuft', header: 'CUFT', format: formatters.number },
];

export function exportRevenueToCSV(data: RevenueExportData[], filename: string = 'revenue') {
  const csv = generateCSV(data, revenueColumns);
  downloadCSV(csv, filename);
}

export function exportRevenueToPDF(
  data: RevenueExportData[],
  options: {
    title?: string;
    filename?: string;
    subtitle?: string;
    summary?: { label: string; value: string }[];
  } = {}
) {
  const pdfColumns: PDFColumn[] = revenueColumns.map((col) => ({
    key: col.key,
    header: col.header,
    format: col.format,
  }));

  const doc = generatePDF({
    title: options.title || 'Revenue Report',
    subtitle: options.subtitle,
    filename: options.filename || 'revenue-report',
    columns: pdfColumns,
    data,
    summary: options.summary,
    footer: 'MoveBoss Pro',
  });

  downloadPDF(doc, options.filename || 'revenue-report');
}

// ============================================
// DRIVERS EXPORT
// ============================================

export interface DriverExportData {
  driver_name: string;
  trip_count: number;
  load_count: number;
  total_miles: number;
  total_revenue_generated: number;
  total_pay: number;
  avg_pay_per_trip: number;
}

const driverColumns: ExportColumn[] = [
  { key: 'driver_name', header: 'Driver' },
  { key: 'trip_count', header: 'Trips', format: formatters.number },
  { key: 'load_count', header: 'Loads', format: formatters.number },
  { key: 'total_miles', header: 'Miles', format: formatters.number },
  { key: 'total_revenue_generated', header: 'Revenue Generated', format: formatters.currency },
  { key: 'total_pay', header: 'Total Pay', format: formatters.currency },
  { key: 'avg_pay_per_trip', header: 'Avg Pay/Trip', format: formatters.currency },
];

export function exportDriversToCSV(drivers: DriverExportData[], filename: string = 'drivers') {
  const csv = generateCSV(drivers, driverColumns);
  downloadCSV(csv, filename);
}

export function exportDriversToPDF(
  drivers: DriverExportData[],
  options: { title?: string; filename?: string; subtitle?: string } = {}
) {
  const pdfColumns: PDFColumn[] = driverColumns.map((col) => ({
    key: col.key,
    header: col.header,
    format: col.format,
  }));

  const doc = generatePDF({
    title: options.title || 'Driver Report',
    subtitle: options.subtitle,
    filename: options.filename || 'driver-report',
    columns: pdfColumns,
    data: drivers,
    footer: 'MoveBoss Pro',
  });

  downloadPDF(doc, options.filename || 'driver-report');
}

// ============================================
// EXPENSES EXPORT
// ============================================

export interface ExpenseExportData {
  date: string;
  type: string;
  description: string;
  trip_number?: string;
  driver_name?: string;
  amount: number;
}

const expenseColumns: ExportColumn[] = [
  { key: 'date', header: 'Date', format: formatters.date },
  { key: 'type', header: 'Type' },
  { key: 'description', header: 'Description' },
  { key: 'trip_number', header: 'Trip #' },
  { key: 'driver_name', header: 'Driver' },
  { key: 'amount', header: 'Amount', format: formatters.currency },
];

export function exportExpensesToCSV(expenses: ExpenseExportData[], filename: string = 'expenses') {
  const csv = generateCSV(expenses, expenseColumns);
  downloadCSV(csv, filename);
}

// ============================================
// COMPLIANCE EXPORT
// ============================================

export interface ComplianceExportData {
  category: string;
  item_name: string;
  document_type: string;
  expiry_date: string | null;
  days_until_expiry: number | null;
  status: string;
}

const complianceColumns: ExportColumn[] = [
  { key: 'category', header: 'Category' },
  { key: 'item_name', header: 'Item' },
  { key: 'document_type', header: 'Document' },
  { key: 'expiry_date', header: 'Expiry Date', format: formatters.date },
  {
    key: 'days_until_expiry',
    header: 'Days Left',
    format: (v) => (v !== null ? String(v) : 'N/A'),
  },
  { key: 'status', header: 'Status' },
];

export function exportComplianceToCSV(
  data: ComplianceExportData[],
  filename: string = 'compliance'
) {
  const csv = generateCSV(data, complianceColumns);
  downloadCSV(csv, filename);
}

export function exportComplianceToPDF(
  data: ComplianceExportData[],
  options: {
    title?: string;
    filename?: string;
    summary?: { label: string; value: string }[];
  } = {}
) {
  const pdfColumns: PDFColumn[] = complianceColumns.map((col) => ({
    key: col.key,
    header: col.header,
    format: col.format,
  }));

  const doc = generatePDF({
    title: options.title || 'Compliance Report',
    subtitle: 'Document Expiration Status',
    filename: options.filename || 'compliance-report',
    columns: pdfColumns,
    data,
    summary: options.summary,
    footer: 'MoveBoss Pro',
  });

  downloadPDF(doc, options.filename || 'compliance-report');
}
