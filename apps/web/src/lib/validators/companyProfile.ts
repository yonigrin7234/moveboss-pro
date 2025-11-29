import { z } from 'zod';

const phoneRegex = /^[\d\-\+\s\(\)]+$/;
const numericish = /^[\d]+$/;

export const companyCapabilitiesOptions = [
  'can_post_loads',
  'can_accept_loads',
  'can_post_marketplace_jobs',
  'can_hire_drivers',
] as const;

export const companyRoles = [
  'carrier',
  'moving_company_shipper_only',
  'moving_company_carrier_and_shipper',
  'broker',
  'owner_operator',
] as const;

export const companyProfileSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required'),
  legal_name: z.string().trim().optional(),
  dot_number: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || numericish.test(v), { message: 'DOT must be numeric' }),
  mc_number: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || numericish.test(v), { message: 'MC must be numeric' }),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || phoneRegex.test(v), { message: 'Invalid phone number' }),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, { message: 'Invalid email' }),
  website: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || z.string().url().safeParse(v).success, { message: 'Invalid URL' }),
  contact_name: z.string().trim().optional(),
  contact_phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || phoneRegex.test(v), { message: 'Invalid phone number' }),
  contact_email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, { message: 'Invalid email' }),
  address_line1: z.string().trim().min(1, 'Address line 1 is required'),
  address_line2: z.string().trim().optional(),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  postal_code: z.string().trim().min(1, 'Postal code is required'),
  country: z.string().trim().optional().default('US'),
  company_role: z.enum(companyRoles).default('carrier'),
  company_capabilities: z
    .array(z.enum(companyCapabilitiesOptions))
    .optional()
    .default([]),
  timezone: z.string().trim().min(1, 'Timezone is required'),
  default_distance_unit: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : 'miles')),
  notes: z.string().trim().optional(),
});

export type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;
