import './lib/async-catch'; // must be first: wraps router handlers to catch async errors
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './lib/logger';
import { apiLimiter } from './middleware/rate-limit';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { openApiDocument } from './openapi/openapi';
import { healthRouter } from './modules/health/health.router';
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { categoriesRouter } from './modules/catalog/categories.router';
import { productsRouter, suggestRouter } from './modules/catalog/products.router';
import { cartRouter } from './modules/cart/cart.router';
import { ordersRouter, publicOrdersRouter } from './modules/orders/orders.router';
import { paymentsRouter } from './modules/payments/payments.router';
import { productReviewsRouter, reviewsRouter } from './modules/reviews/reviews.router';
import { wishlistRouter } from './modules/wishlist/wishlist.router';
import { couponCheckRouter, couponsAdminRouter } from './modules/coupons/coupons.router';
import { adminRouter } from './modules/admin/admin.router';
import { brandsRouter } from './modules/catalog/brands.router';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== 'test',
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : 'info'),
    }),
  );

  // API documentation (public, useful for mobile/desktop client developers)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'MehrWearingShop API Docs',
  }));
  app.get('/api/openapi.json', (_req, res) => res.json(openApiDocument));

  const v1 = express.Router();
  v1.use(apiLimiter);
  v1.use('/health', healthRouter);
  v1.use('/auth', authRouter);
  v1.use('/', usersRouter); // /me, /me/addresses
  v1.use('/categories', categoriesRouter);
  v1.use('/brands', brandsRouter);
  v1.use('/products', productsRouter);
  v1.use('/products/:slug/reviews', productReviewsRouter);
  v1.use('/reviews', reviewsRouter);
  v1.use('/search/suggest', suggestRouter);
  v1.use('/cart', cartRouter);
  v1.use('/', ordersRouter); // /checkout/orders, /orders
  v1.use('/', publicOrdersRouter);
  v1.use('/payments', paymentsRouter);
  v1.use('/wishlist', wishlistRouter);
  v1.use('/coupons', couponCheckRouter);
  v1.use('/admin/coupons', couponsAdminRouter);
  v1.use('/admin', adminRouter);

  app.use('/api/v1', v1);

  app.get('/', (_req, res) => {
    res.json({
      data: {
        name: 'MehrWearingShop API',
        version: '1.0.0',
        docs: '/api/docs',
        openapi: '/api/openapi.json',
        health: '/api/v1/health',
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
