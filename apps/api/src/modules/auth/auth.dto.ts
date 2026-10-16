import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('email is not valid'),
  password: z.string().min(8, 'password must be at least 8 characters').max(72),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z
    .string()
    .regex(/^09\d{9}$/, 'phone must be a valid Iranian mobile number (09xxxxxxxxx)')
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

export const otpRequestSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^09\d{9}$/),
  code: z.string().length(5),
});
