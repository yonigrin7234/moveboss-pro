import { z } from 'zod';
import { type DriverType } from '@/data/domain-types';

export const driverStatusSchema = z.enum(['active', 'inactive', 'suspended', 'archived']);
export const driverPayModeSchema = z.enum([
  'per_mile',
  'per_cuft',
  'per_mile_and_cuft',
  'percent_of_revenue',
  'flat_daily_rate',
]);
export const driverLoginMethodSchema = z.enum(['email', 'phone']);

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
    message: 'Invalid email address',
  })
  .transform((val) => (val && val.trim() ? val.trim() : undefined));

export const newDriverInputSchema = z
  .object({
    first_name: z.string().trim().min(1, 'First name is required').max(100),
    last_name: z.string().trim().min(1, 'Last name is required').max(100),
    phone: z.string().trim().min(1, 'Phone is required').max(50),
    email: optionalEmailSchema,
    date_of_birth: z.string().optional().transform((val) => {
      if (!val || val === '') return undefined;
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : val;
    }),
    start_date: z.string().optional().transform((val) => {
      if (!val || val === '') return undefined;
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : val;
    }),
    has_login: z.boolean().optional().default(false),
    login_method: driverLoginMethodSchema.optional().default('email'),
    license_number: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    license_state: z
      .string()
      .trim()
      .max(50)
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    license_expiry: z
      .string()
      .optional()
      .transform((val) => {
        if (!val || val === '') return undefined;
        const date = new Date(val);
        return isNaN(date.getTime()) ? undefined : val;
      }),
    medical_card_expiry: z
      .string()
      .optional()
      .transform((val) => {
        if (!val || val === '') return undefined;
        const date = new Date(val);
        return isNaN(date.getTime()) ? undefined : val;
      }),
    status: driverStatusSchema.optional().default('active'),
    driver_type: z
      .string()
      .optional()
      .transform((val) => (val && val.length > 0 ? (val as DriverType) : ('company_driver' as DriverType))),
    company_id: z.string().uuid().optional(),
    leased_to_company_id: z.string().uuid().optional().nullable(),
    assigned_truck_id: z.string().uuid().optional().nullable(),
    assigned_trailer_id: z.string().uuid().optional().nullable(),
    // Default equipment for auto-populating trips
    default_truck_id: z.string().uuid().optional().nullable(),
    default_trailer_id: z.string().uuid().optional().nullable(),
    pay_mode: driverPayModeSchema,
    rate_per_mile: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      })
      .refine((val) => val === undefined || val >= 0, {
        message: 'Rate per mile must be >= 0',
      }),
    rate_per_cuft: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      })
      .refine((val) => val === undefined || val >= 0, {
        message: 'Rate per cubic foot must be >= 0',
      }),
    percent_of_revenue: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      })
      .refine((val) => val === undefined || (val >= 0 && val <= 100), {
        message: 'Percent of revenue must be between 0 and 100',
      }),
    flat_daily_rate: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      })
      .refine((val) => val === undefined || val >= 0, {
        message: 'Flat daily rate must be >= 0',
      }),
    pay_notes: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(5000).optional(),
    // Location & capacity settings
    location_sharing_enabled: z.boolean().optional().default(false),
    auto_post_capacity: z.boolean().optional().default(false),
    capacity_visibility: z.enum(['private', 'network', 'public']).optional().default('private'),
  })
  .refine(
    (data) => {
      if (data.pay_mode === 'per_mile') {
        return data.rate_per_mile !== undefined && data.rate_per_mile !== null;
      }
      return true;
    },
    {
      message: 'Rate per mile is required when pay mode is "per_mile"',
      path: ['rate_per_mile'],
    }
  )
  .refine(
    (data) => {
      if (data.pay_mode === 'per_cuft') {
        return data.rate_per_cuft !== undefined && data.rate_per_cuft !== null;
      }
      return true;
    },
    {
      message: 'Rate per cubic foot is required when pay mode is "per_cuft"',
      path: ['rate_per_cuft'],
    }
  )
  .refine(
    (data) => {
      if (data.pay_mode === 'per_mile_and_cuft') {
        return (
          data.rate_per_mile !== undefined &&
          data.rate_per_mile !== null &&
          data.rate_per_cuft !== undefined &&
          data.rate_per_cuft !== null
        );
      }
      return true;
    },
    {
      message:
        'Both rate per mile and rate per cubic foot are required when pay mode is "per_mile_and_cuft"',
      path: ['rate_per_mile'],
    }
  )
  .refine(
    (data) => {
      if (data.pay_mode === 'percent_of_revenue') {
        return data.percent_of_revenue !== undefined && data.percent_of_revenue !== null;
      }
      return true;
    },
    {
      message: 'Percent of revenue is required when pay mode is "percent_of_revenue"',
      path: ['percent_of_revenue'],
    }
  )
  .refine(
    (data) => {
      if (data.pay_mode === 'flat_daily_rate') {
        return data.flat_daily_rate !== undefined && data.flat_daily_rate !== null;
      }
      return true;
    },
    {
      message: 'Flat daily rate is required when pay mode is "flat_daily_rate"',
      path: ['flat_daily_rate'],
    }
  );

export const updateDriverInputSchema = newDriverInputSchema.partial();

export type DriverStatus = z.infer<typeof driverStatusSchema>;
export type DriverPayMode = z.infer<typeof driverPayModeSchema>;
export type DriverLoginMethod = z.infer<typeof driverLoginMethodSchema>;
export type NewDriverInput = z.infer<typeof newDriverInputSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverInputSchema>;

export function formatPayMode(payMode: DriverPayMode): string {
  switch (payMode) {
    case 'per_mile':
      return 'Per mile';
    case 'per_cuft':
      return 'Per cubic foot';
    case 'per_mile_and_cuft':
      return 'Per mile and cubic foot';
    case 'percent_of_revenue':
      return '% of trip revenue';
    case 'flat_daily_rate':
      return 'Flat daily rate';
    default:
      return payMode;
  }
}
