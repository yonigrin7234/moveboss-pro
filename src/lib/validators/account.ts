import { z } from 'zod';

const phoneRegex = /^[\d\-\+\s\(\)]+$/;

export const accountSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(200),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined))
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Invalid phone number',
    }),
  timezone: z.string().trim().min(1, 'Timezone is required'),
  email_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(false),
});

export type AccountFormValues = z.infer<typeof accountSchema>;
