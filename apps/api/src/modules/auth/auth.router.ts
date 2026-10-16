import { Router } from 'express';
import { env, isProd } from '../../config/env';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rate-limit';
import * as authService from './auth.service';
import {
  loginSchema,
  logoutSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  registerSchema,
} from './auth.dto';

export const authRouter = Router();

/** Guest cart id sent by web/mobile clients so login merges the local cart. */
const guestCart = (header?: string) => (typeof header === 'string' ? header : undefined);

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res) => {
  const result = await authService.register({
    ...req.body,
    guestCartId: guestCart(req.headers['x-cart-id'] as string),
  });
  res.status(201).json({ data: result });
});

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
  const result = await authService.login({
    ...req.body,
    guestCartId: guestCart(req.headers['x-cart-id'] as string),
  });
  res.json({ data: result });
});

authRouter.post('/refresh', validate({ body: refreshSchema }), async (req, res) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  res.json({ data: tokens });
});

authRouter.post('/logout', validate({ body: logoutSchema }), async (req, res) => {
  const result = await authService.logout(req.body.refreshToken);
  res.json({ data: result });
});

authRouter.post('/otp/request', authLimiter, validate({ body: otpRequestSchema }), async (req, res) => {
  const result = await authService.requestOtp(req.body.phone);
  res.json({
    data: {
      ...result,
      // Dev convenience only — production sends the code via SMS.
      ...(isProd ? {} : { devCode: result.code }),
    },
  });
});

authRouter.post('/otp/verify', authLimiter, validate({ body: otpVerifySchema }), async (req, res) => {
  const result = await authService.verifyOtp(req.body.phone, req.body.code);
  res.json({ data: result });
});

// OAuth placeholder kept for future "sign in with Google" support.
authRouter.get('/oauth/google', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: `Configure GOOGLE_CLIENT_ID/SECRET to enable. Callback: ${env.API_PUBLIC_URL}/api/v1/auth/oauth/google/callback`,
    },
  });
});
