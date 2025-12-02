export type DashboardMode = 'carrier' | 'broker' | 'hybrid';

export function getDashboardMode(company: {
  is_broker?: boolean;
  is_carrier?: boolean;
}): DashboardMode {
  if (company?.is_broker && company?.is_carrier) return 'hybrid';
  if (company?.is_carrier) return 'carrier';
  return 'broker';
}
