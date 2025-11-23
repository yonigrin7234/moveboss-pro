export type CompanyCapability = 'carrier' | 'broker' | 'shipper_only' | 'shipper_carrier' | 'owner_operator' | 'hybrid';

export type CompanyRole =
  | 'owner'
  | 'admin'
  | 'dispatcher'
  | 'operations'
  | 'accounting'
  | 'driver_portal'
  | 'broker_ops';

export type DriverType = 'company_driver' | 'owner_operator' | 'contract_driver';
