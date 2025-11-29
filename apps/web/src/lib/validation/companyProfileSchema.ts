import { z } from 'zod';

const phoneRegex = /^[\d\-\+\s\(\)]+$/;

export const companyProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .refine((val) => phoneRegex.test(val), { message: 'Invalid phone number' }),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
  state: z.string().trim().min(1, 'State is required'),
  city: z.string().trim().min(1, 'City is required'),
  address_line1: z.string().trim().min(1, 'Address line 1 is required'),
  address_line2: z.string().trim().optional(),
  website: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || z.string().url().safeParse(v).success, { message: 'Invalid URL' }),
  notes: z.string().trim().optional(),
  dot_number: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  mc_number: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  zip: z.string().trim().optional(),
  owner_name: z.string().trim().min(2, 'Owner name is required'),
  owner_role: z.string().trim().min(2, 'Owner role must be at least 2 characters').optional().nullable(),
  owner_phone: z
    .string()
    .trim()
    .min(7, 'Owner phone must be at least 7 characters')
    .refine((val) => phoneRegex.test(val), { message: 'Invalid phone number' }),
  owner_email: z.string().trim().email('Invalid owner email'),
  secondary_contact_name: z.string().trim().min(2).optional().nullable(),
  secondary_contact_phone: z
    .string()
    .trim()
    .min(7)
    .optional()
    .nullable()
    .refine((val) => val === null || val === undefined || phoneRegex.test(val), { message: 'Invalid phone number' }),
  secondary_contact_email: z.string().trim().email().optional().nullable(),
});

export type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;
