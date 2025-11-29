export type PermissionKey =
  | 'can_post_pickups'
  | 'can_post_loads'
  | 'can_manage_carrier_requests'
  | 'can_manage_drivers'
  | 'can_manage_vehicles'
  | 'can_manage_trips'
  | 'can_manage_loads'
  | 'can_view_financials'
  | 'can_manage_settlements';

export type PermissionPreset = 'admin' | 'dispatcher' | 'fleet_manager' | 'accountant' | 'operations' | 'custom';

export interface PermissionPresetConfig {
  label: string;
  description: string;
  permissions: Record<PermissionKey, boolean>;
}

export const PERMISSION_PRESETS: Record<PermissionPreset, PermissionPresetConfig> = {
  admin: {
    label: 'Admin',
    description: 'Full access to everything',
    permissions: {
      can_post_pickups: true,
      can_post_loads: true,
      can_manage_carrier_requests: true,
      can_manage_drivers: true,
      can_manage_vehicles: true,
      can_manage_trips: true,
      can_manage_loads: true,
      can_view_financials: true,
      can_manage_settlements: true,
    },
  },
  dispatcher: {
    label: 'Dispatcher',
    description: 'Posting, carrier requests, and load management',
    permissions: {
      can_post_pickups: true,
      can_post_loads: true,
      can_manage_carrier_requests: true,
      can_manage_drivers: false,
      can_manage_vehicles: false,
      can_manage_trips: true,
      can_manage_loads: true,
      can_view_financials: false,
      can_manage_settlements: false,
    },
  },
  fleet_manager: {
    label: 'Fleet Manager',
    description: 'Manage drivers and vehicles',
    permissions: {
      can_post_pickups: false,
      can_post_loads: false,
      can_manage_carrier_requests: false,
      can_manage_drivers: true,
      can_manage_vehicles: true,
      can_manage_trips: false,
      can_manage_loads: false,
      can_view_financials: false,
      can_manage_settlements: false,
    },
  },
  accountant: {
    label: 'Accountant',
    description: 'View financials and manage settlements',
    permissions: {
      can_post_pickups: false,
      can_post_loads: false,
      can_manage_carrier_requests: false,
      can_manage_drivers: false,
      can_manage_vehicles: false,
      can_manage_trips: false,
      can_manage_loads: false,
      can_view_financials: true,
      can_manage_settlements: true,
    },
  },
  operations: {
    label: 'Operations',
    description: 'Manage trips and loads',
    permissions: {
      can_post_pickups: false,
      can_post_loads: false,
      can_manage_carrier_requests: false,
      can_manage_drivers: false,
      can_manage_vehicles: false,
      can_manage_trips: true,
      can_manage_loads: true,
      can_view_financials: false,
      can_manage_settlements: false,
    },
  },
  custom: {
    label: 'Custom',
    description: 'Custom permissions',
    permissions: {
      can_post_pickups: false,
      can_post_loads: false,
      can_manage_carrier_requests: false,
      can_manage_drivers: false,
      can_manage_vehicles: false,
      can_manage_trips: false,
      can_manage_loads: false,
      can_view_financials: false,
      can_manage_settlements: false,
    },
  },
};

export interface PermissionGroup {
  name: string;
  permissions: Array<{
    key: PermissionKey;
    label: string;
    description: string;
  }>;
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'Posting',
    permissions: [
      { key: 'can_post_pickups', label: 'Post Pickups', description: 'Create and edit pickup postings' },
      { key: 'can_post_loads', label: 'Post Loads', description: 'Create and edit load postings' },
      {
        key: 'can_manage_carrier_requests',
        label: 'Manage Carrier Requests',
        description: 'Accept or decline carrier requests',
      },
    ],
  },
  {
    name: 'Fleet',
    permissions: [
      { key: 'can_manage_drivers', label: 'Manage Drivers', description: 'Add, edit, and remove drivers' },
      { key: 'can_manage_vehicles', label: 'Manage Vehicles', description: 'Add, edit trucks and trailers' },
    ],
  },
  {
    name: 'Operations',
    permissions: [
      { key: 'can_manage_trips', label: 'Manage Trips', description: 'Create, edit, and close trips' },
      { key: 'can_manage_loads', label: 'Manage Loads', description: 'Assign loads and update status' },
    ],
  },
  {
    name: 'Financial',
    permissions: [
      { key: 'can_view_financials', label: 'View Financials', description: 'See revenue, expenses, and reports' },
      {
        key: 'can_manage_settlements',
        label: 'Manage Settlements',
        description: 'Create and approve driver settlements',
      },
    ],
  },
];

export interface UserProfile {
  id: string;
  is_admin?: boolean;
  can_post_pickups?: boolean;
  can_post_loads?: boolean;
  can_manage_carrier_requests?: boolean;
  can_manage_drivers?: boolean;
  can_manage_vehicles?: boolean;
  can_manage_trips?: boolean;
  can_manage_loads?: boolean;
  can_view_financials?: boolean;
  can_manage_settlements?: boolean;
  permission_preset?: PermissionPreset | null;
  [key: string]: unknown;
}

// Helper to check if user has a specific permission
export function hasPermission(profile: UserProfile | null | undefined, permission: PermissionKey): boolean {
  if (!profile) return false;
  if (profile.is_admin) return true;
  return profile[permission] === true;
}

// Helper to check if user can access a feature (needs ANY of the permissions)
export function canAccess(profile: UserProfile | null | undefined, requiredPermissions: PermissionKey[]): boolean {
  if (!profile) return false;
  if (profile.is_admin) return true;
  return requiredPermissions.some((p) => profile[p] === true);
}

// Helper to check if user has ALL of the required permissions
export function hasAllPermissions(
  profile: UserProfile | null | undefined,
  requiredPermissions: PermissionKey[]
): boolean {
  if (!profile) return false;
  if (profile.is_admin) return true;
  return requiredPermissions.every((p) => profile[p] === true);
}

// Type for permission summary input (only needs the permission fields)
export interface PermissionFields {
  is_admin?: boolean;
  can_post_pickups?: boolean;
  can_post_loads?: boolean;
  can_manage_carrier_requests?: boolean;
  can_manage_drivers?: boolean;
  can_manage_vehicles?: boolean;
  can_manage_trips?: boolean;
  can_manage_loads?: boolean;
  can_view_financials?: boolean;
  can_manage_settlements?: boolean;
}

// Get permissions summary as a string array
export function getPermissionsSummary(profile: PermissionFields | null | undefined): string[] {
  if (!profile) return [];
  if (profile.is_admin) return ['Full access'];

  const summary: string[] = [];

  if (profile.can_post_pickups || profile.can_post_loads) {
    summary.push('Posting');
  }
  if (profile.can_manage_carrier_requests) {
    summary.push('Carrier Requests');
  }
  if (profile.can_manage_drivers || profile.can_manage_vehicles) {
    summary.push('Fleet');
  }
  if (profile.can_manage_trips || profile.can_manage_loads) {
    summary.push('Operations');
  }
  if (profile.can_view_financials || profile.can_manage_settlements) {
    summary.push('Financial');
  }

  return summary.length > 0 ? summary : ['No permissions'];
}

// Detect which preset matches the current permissions
export function detectPreset(permissions: Record<PermissionKey, boolean>): PermissionPreset {
  for (const [preset, config] of Object.entries(PERMISSION_PRESETS)) {
    if (preset === 'custom') continue;

    const matches = (Object.keys(config.permissions) as PermissionKey[]).every(
      (key) => config.permissions[key] === permissions[key]
    );

    if (matches) return preset as PermissionPreset;
  }
  return 'custom';
}

// Get preset label
export function getPresetLabel(preset: PermissionPreset | null | undefined): string {
  if (!preset || preset === 'custom') return 'Custom';
  return PERMISSION_PRESETS[preset]?.label || 'Custom';
}
