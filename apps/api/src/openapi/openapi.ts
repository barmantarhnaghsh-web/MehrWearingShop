/**
 * OpenAPI 3.0 document served at /api/docs (Swagger UI) and /api/openapi.json.
 * This is the contract for web, mobile and desktop clients.
 */
import { pathsDoc } from './paths';

const ref = (name: string) => ({
  description: name,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const errors = {
  BadRequest: ref('Validation error'),
  Unauthorized: ref('Missing/invalid token'),
  Forbidden: ref('Insufficient permissions'),
  NotFound: ref('Resource not found'),
  Conflict: ref('Duplicate resource'),
  Unprocessable: ref('Business rule violated'),
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'MehrWearingShop API',
    version: '1.0.0',
    description:
      'REST API powering the MehrWearingShop storefront and its mobile/desktop clients.\n\n' +
      '**Auth:** `POST /auth/login` returns an `accessToken` (JWT, 15 min) and a `refreshToken` (30 days). ' +
      'Send `Authorization: Bearer <accessToken>` on protected routes. Refresh with `POST /auth/refresh`.\n\n' +
      '**Money:** all amounts are integer **Toman**.\n\n' +
      '**Guest carts:** send a client-generated UUID in the `x-cart-id` header; it merges into the account on login/register.',
    contact: { name: 'MehrWearingShop Team', email: 'team@mwrshop.dev' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: 'http://localhost:4000/api/v1', description: 'Local development' },
    { url: 'https://api.mwrshop.ir/api/v1', description: 'Production' },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Catalog' },
    { name: 'Cart' },
    { name: 'Orders' },
    { name: 'Payments' },
    { name: 'Reviews' },
    { name: 'Wishlist' },
    { name: 'Coupons' },
    { name: 'Admin' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      page: { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
      limit: { name: 'limit', in: 'query', schema: { type: 'integer', default: 12, maximum: 50 } },
      cartId: {
        name: 'x-cart-id',
        in: 'header',
        required: false,
        description: 'Guest cart id (UUID) for anonymous carts',
        schema: { type: 'string' },
      },
    },
    responses: errors,
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
      PageMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'JWT; send as Bearer token' },
          refreshToken: { type: 'string', description: 'Store securely; rotate via /auth/refresh' },
          expiresIn: { type: 'string', example: '15m' },
        },
      },
      Variant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          sku: { type: 'string' },
          nameFa: { type: 'string', nullable: true },
          nameEn: { type: 'string', nullable: true },
          price: { type: 'integer', nullable: true, description: 'override of basePrice' },
          stock: { type: 'integer' },
          attributes: { type: 'object', nullable: true, example: { color: 'آبی' } },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          nameFa: { type: 'string' },
          nameEn: { type: 'string' },
          descriptionFa: { type: 'string', nullable: true },
          descriptionEn: { type: 'string', nullable: true },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
          basePrice: { type: 'integer' },
          minPrice: { type: 'integer' },
          stock: { type: 'integer' },
          ratingAvg: { type: 'number' },
          ratingCount: { type: 'integer' },
          soldCount: { type: 'integer' },
          isFeatured: { type: 'boolean' },
          isNew: { type: 'boolean' },
          category: { $ref: '#/components/schemas/Category' },
          brand: { $ref: '#/components/schemas/Brand' },
          variants: { type: 'array', items: { $ref: '#/components/schemas/Variant' } },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          nameFa: { type: 'string' },
          nameEn: { type: 'string' },
          parentId: { type: 'string', nullable: true },
          icon: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
        },
      },
      Brand: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          nameFa: { type: 'string' },
          nameEn: { type: 'string' },
          logoUrl: { type: 'string', nullable: true },
        },
      },
      Address: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          phone: { type: 'string' },
          province: { type: 'string' },
          city: { type: 'string' },
          postalCode: { type: 'string' },
          addressLine: { type: 'string' },
          isDefault: { type: 'boolean' },
        },
      },
      Totals: {
        type: 'object',
        properties: {
          subtotal: { type: 'integer' },
          discount: { type: 'integer' },
          shippingCost: { type: 'integer' },
          total: { type: 'integer' },
          couponCode: { type: 'string', nullable: true },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          items: { type: 'array', items: { type: 'object' } },
          totals: { $ref: '#/components/schemas/Totals' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orderNumber: { type: 'string', example: 'MWR-8F3K2Q' },
          status: {
            type: 'string',
            enum: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
          },
          subtotal: { type: 'integer' },
          discount: { type: 'integer' },
          shippingCost: { type: 'integer' },
          total: { type: 'integer' },
          address: { type: 'object' },
          items: { type: 'array', items: { type: 'object' } },
          payment: { type: 'object', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          title: { type: 'string', nullable: true },
          body: { type: 'string' },
          author: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Coupon: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          type: { type: 'string', enum: ['PERCENT', 'FIXED'] },
          value: { type: 'integer' },
          minOrderAmount: { type: 'integer', nullable: true },
          maxDiscount: { type: 'integer', nullable: true },
          usageLimit: { type: 'integer', nullable: true },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
    },
  },
  paths: pathsDoc,
} as const;
