/** Path declarations for the OpenAPI document (split out to keep files readable). */

const errors = {
  BadRequest: { $ref: '#/components/responses/BadRequest' },
  Unauthorized: { $ref: '#/components/responses/Unauthorized' },
  Forbidden: { $ref: '#/components/responses/Forbidden' },
  NotFound: { $ref: '#/components/responses/NotFound' },
  Conflict: { $ref: '#/components/responses/Conflict' },
  Unprocessable: { $ref: '#/components/responses/Unprocessable' },
};

const pageParams = [
  { $ref: '#/components/parameters/page' },
  { $ref: '#/components/parameters/limit' },
];

const pathParam = (name: string) => ({ name, in: 'path', required: true, schema: { type: 'string' } });
const queryParam = (name: string, schema: Record<string, unknown>, description?: string) => ({
  name,
  in: 'query',
  schema,
  ...(description ? { description } : {}),
});
const body = (schema: Record<string, unknown>) => ({
  required: true,
  content: { 'application/json': { schema } },
});
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  required,
  properties,
});
const json = (ref: string) => ({
  description: 'OK',
  content: { 'application/json': { schema: { $ref: ref } } },
});
const list = (itemRef: string) => ({
  description: 'OK',
  content: {
    'application/json': {
      schema: obj({
        data: { type: 'array', items: { $ref: itemRef } },
        meta: { $ref: '#/components/schemas/PageMeta' },
      }),
    },
  },
});
const auth = [{ bearerAuth: [] }];
const ok = (description = 'OK') => ({ description });

export const pathsDoc = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Service & database health probe',
      responses: { 200: ok('OK'), 503: ok('Database down') },
    },
  },
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Create an account (merges guest cart)',
      parameters: [{ $ref: '#/components/parameters/cartId' }],
      requestBody: body(
        obj(
          {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string', pattern: '^09\\d{9}$' },
          },
          ['email', 'password', 'firstName', 'lastName'],
        ),
      ),
      responses: {
        201: {
          description: 'Account created',
          content: {
            'application/json': {
              schema: obj({
                data: obj({
                  user: { $ref: '#/components/schemas/User' },
                  tokens: { $ref: '#/components/schemas/AuthTokens' },
                }),
              }),
            },
          },
        },
        409: errors.Conflict,
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Email + password login',
      parameters: [{ $ref: '#/components/parameters/cartId' }],
      requestBody: body(obj({ email: { type: 'string' }, password: { type: 'string' } }, ['email', 'password'])),
      responses: { 200: ok('Token pair'), 401: errors.Unauthorized },
    },
  },
  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Rotate refresh token & get a new access token',
      requestBody: body(obj({ refreshToken: { type: 'string' } }, ['refreshToken'])),
      responses: { 200: ok('New token pair'), 401: errors.Unauthorized },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Revoke a refresh token',
      requestBody: body(obj({ refreshToken: { type: 'string' } })),
      responses: { 200: ok('Revoked') },
    },
  },
  '/auth/otp/request': {
    post: {
      tags: ['Auth'],
      summary: 'Request phone OTP (dev mode returns devCode)',
      requestBody: body(obj({ phone: { type: 'string' } }, ['phone'])),
      responses: { 200: ok('OTP issued') },
    },
  },
  '/auth/otp/verify': {
    post: {
      tags: ['Auth'],
      summary: 'Verify OTP and sign in (auto-registers)',
      requestBody: body(obj({ phone: { type: 'string' }, code: { type: 'string' } }, ['phone', 'code'])),
      responses: { 200: ok('Token pair'), 401: errors.Unauthorized },
    },
  },
  '/me': {
    get: { tags: ['Users'], summary: 'Current user profile', security: auth, responses: { 200: ok('Profile'), 401: errors.Unauthorized } },
    patch: { tags: ['Users'], summary: 'Update profile', security: auth, requestBody: body(obj({ firstName: { type: 'string' }, lastName: { type: 'string' }, phone: { type: 'string' } })), responses: { 200: ok('Updated') } },
  },
  '/me/addresses': {
    get: { tags: ['Users'], summary: 'List my addresses', security: auth, responses: { 200: ok('Addresses') } },
    post: { tags: ['Users'], summary: 'Create address', security: auth, requestBody: body({ $ref: '#/components/schemas/Address' }), responses: { 201: ok('Created'), 400: errors.BadRequest } },
  },
  '/me/addresses/{id}': {
    patch: { tags: ['Users'], summary: 'Update address', security: auth, parameters: [pathParam('id')], requestBody: body({ $ref: '#/components/schemas/Address' }), responses: { 200: ok('Updated'), 404: errors.NotFound } },
    delete: { tags: ['Users'], summary: 'Delete address', security: auth, parameters: [pathParam('id')], responses: { 200: ok('Deleted') } },
  },
  '/categories': {
    get: { tags: ['Catalog'], summary: 'Category navigation tree', responses: { 200: ok('Tree of categories') } },
  },
  '/categories/{slug}': {
    get: { tags: ['Catalog'], summary: 'Category with paginated products', parameters: [pathParam('slug'), ...pageParams], responses: { 200: ok('Category + products'), 404: errors.NotFound } },
  },
  '/brands': {
    get: { tags: ['Catalog'], summary: 'All brands', responses: { 200: ok('Brands') } },
  },
  '/brands/{slug}': {
    get: { tags: ['Catalog'], summary: 'Brand with products', parameters: [pathParam('slug')], responses: { 200: ok('Brand + products'), 404: errors.NotFound } },
  },
  '/products': {
    get: {
      tags: ['Catalog'],
      summary: 'Search & filter products',
      parameters: [
        queryParam('q', { type: 'string' }, 'Persian or English search text'),
        queryParam('category', { type: 'string' }, 'category slug'),
        queryParam('brand', { type: 'string' }, 'brand slug'),
        queryParam('minPrice', { type: 'integer' }),
        queryParam('maxPrice', { type: 'integer' }),
        queryParam('minRating', { type: 'number' }),
        queryParam('sort', { type: 'string', enum: ['newest', 'price-asc', 'price-desc', 'bestselling', 'rating'] }),
        ...pageParams,
      ],
      responses: { 200: list('#/components/schemas/Product') },
    },
  },
  '/products/{slug}': {
    get: { tags: ['Catalog'], summary: 'Product detail (with variants)', parameters: [pathParam('slug')], responses: { 200: ok('Product'), 404: errors.NotFound } },
  },
  '/products/{slug}/related': {
    get: { tags: ['Catalog'], summary: 'Related products from same category', parameters: [pathParam('slug')], responses: { 200: ok('Products') } },
  },
  '/products/{slug}/reviews': {
    get: { tags: ['Reviews'], summary: 'Approved reviews for a product', parameters: [pathParam('slug'), ...pageParams], responses: { 200: list('#/components/schemas/Review') } },
    post: {
      tags: ['Reviews'],
      summary: 'Write a review (one per user)',
      security: auth,
      parameters: [pathParam('slug')],
      requestBody: body(obj({ rating: { type: 'integer', minimum: 1, maximum: 5 }, title: { type: 'string' }, body: { type: 'string' } }, ['rating', 'body'])),
      responses: { 201: ok('Created'), 409: errors.Conflict },
    },
  },
  '/reviews': {
    get: { tags: ['Reviews'], summary: 'My reviews (with product refs)', security: auth, parameters: [...pageParams], responses: { 200: list('#/components/schemas/Review'), 401: errors.Unauthorized } },
  },
  '/reviews/{id}': {
    delete: { tags: ['Reviews'], summary: 'Delete one of my reviews', security: auth, parameters: [pathParam('id')], responses: { 200: ok('Deleted'), 401: errors.Unauthorized, 404: errors.NotFound } },
  },
  '/search/suggest': {
    get: { tags: ['Catalog'], summary: 'Search autocomplete', parameters: [queryParam('q', { type: 'string' })], responses: { 200: ok('Suggestions') } },
  },
  '/cart': {
    get: { tags: ['Cart'], summary: 'Get my cart (auth or guest via x-cart-id)', parameters: [{ $ref: '#/components/parameters/cartId' }], responses: { 200: json('#/components/schemas/Cart') } },
    delete: { tags: ['Cart'], summary: 'Empty the cart', parameters: [{ $ref: '#/components/parameters/cartId' }], responses: { 200: ok('Cleared') } },
  },
  '/cart/items': {
    post: {
      tags: ['Cart'],
      summary: 'Add item to cart',
      parameters: [{ $ref: '#/components/parameters/cartId' }],
      requestBody: body(obj({ variantId: { type: 'string', format: 'uuid' }, quantity: { type: 'integer', default: 1 } }, ['variantId'])),
      responses: { 201: json('#/components/schemas/Cart'), 422: errors.Unprocessable },
    },
  },
  '/cart/items/{variantId}': {
    patch: { tags: ['Cart'], summary: 'Set item quantity (0 removes)', parameters: [pathParam('variantId'), { $ref: '#/components/parameters/cartId' }], requestBody: body(obj({ quantity: { type: 'integer' } }, ['quantity'])), responses: { 200: json('#/components/schemas/Cart') } },
    delete: { tags: ['Cart'], summary: 'Remove item from cart', parameters: [pathParam('variantId'), { $ref: '#/components/parameters/cartId' }], responses: { 200: json('#/components/schemas/Cart') } },
  },
  '/cart/coupon': {
    put: { tags: ['Cart'], summary: 'Apply or remove coupon code', parameters: [{ $ref: '#/components/parameters/cartId' }], requestBody: body(obj({ code: { type: 'string', nullable: true } })), responses: { 200: json('#/components/schemas/Cart') } },
  },
  '/coupons/check': {
    post: { tags: ['Coupons'], summary: 'Dry-run validate a coupon for a subtotal', requestBody: body(obj({ code: { type: 'string' }, subtotal: { type: 'integer' } }, ['code'])), responses: { 200: ok('Discount preview'), 422: errors.Unprocessable } },
  },
  '/checkout/orders': {
    post: {
      tags: ['Orders'],
      summary: 'Convert cart into an order (reserves stock, creates payment)',
      security: auth,
      requestBody: body(
        obj(
          {
            address: { $ref: '#/components/schemas/Address' },
            addressId: { type: 'string', description: 'use a saved address instead of inline' },
            note: { type: 'string' },
            gateway: { type: 'string', enum: ['mock', 'zarinpal', 'cod'] },
          },
          ['address'],
        ),
      ),
      responses: { 201: ok('Order created; paymentUrl included when redirect is needed'), 422: errors.Unprocessable },
    },
  },
  '/orders': {
    get: { tags: ['Orders'], summary: 'My orders', security: auth, parameters: pageParams, responses: { 200: list('#/components/schemas/Order') } },
  },
  '/orders/{id}': {
    get: { tags: ['Orders'], summary: 'Order detail (id or order number)', security: auth, parameters: [pathParam('id')], responses: { 200: ok('Order'), 404: errors.NotFound } },
  },
  '/orders/{id}/cancel': {
    post: { tags: ['Orders'], summary: 'Cancel my pending order (restocks items)', security: auth, parameters: [pathParam('id')], responses: { 200: ok('Cancelled'), 422: errors.Unprocessable } },
  },
  '/orders/public/{orderNumber}': {
    get: { tags: ['Orders'], summary: 'Public order summary for thank-you page', parameters: [pathParam('orderNumber')], responses: { 200: ok('Summary') } },
  },
  '/payments/mock/{paymentId}': {
    get: { tags: ['Payments'], summary: 'Simulated payment page (dev/demo)', parameters: [pathParam('paymentId')], responses: { 200: ok('HTML page') } },
  },
  '/payments/zarinpal/callback': {
    get: { tags: ['Payments'], summary: 'ZarinPal redirect target', parameters: [queryParam('Authority', { type: 'string' }), queryParam('Status', { type: 'string' })], responses: { 302: ok('Redirect to web success/failure page') } },
  },
  '/wishlist': {
    get: { tags: ['Wishlist'], summary: 'My wishlist', security: auth, responses: { 200: ok('Products') } },
  },
  '/wishlist/{productId}': {
    post: { tags: ['Wishlist'], summary: 'Add to wishlist (idempotent)', security: auth, parameters: [pathParam('productId')], responses: { 201: ok('Added') } },
    delete: { tags: ['Wishlist'], summary: 'Remove from wishlist', security: auth, parameters: [pathParam('productId')], responses: { 200: ok('Removed') } },
  },
  '/admin/stats': {
    get: { tags: ['Admin'], summary: 'Dashboard KPIs', security: auth, responses: { 200: ok('Stats'), 403: errors.Forbidden } },
  },
  '/admin/products': {
    get: { tags: ['Admin'], summary: 'List products (any status)', security: auth, parameters: pageParams, responses: { 200: list('#/components/schemas/Product') } },
    post: { tags: ['Admin'], summary: 'Create product with variants', security: auth, requestBody: body({ type: 'object' }), responses: { 201: ok('Created') } },
  },
  '/admin/products/{id}': {
    get: { tags: ['Admin'], summary: 'Product detail', security: auth, parameters: [pathParam('id')], responses: { 200: ok('Product'), 404: errors.NotFound } },
    patch: { tags: ['Admin'], summary: 'Update product', security: auth, parameters: [pathParam('id')], requestBody: body({ type: 'object' }), responses: { 200: ok('Updated') } },
    delete: { tags: ['Admin'], summary: 'Archive product (soft delete)', security: auth, parameters: [pathParam('id')], responses: { 200: ok('Archived') } },
  },
  '/admin/products/{id}/variants': {
    post: { tags: ['Admin'], summary: 'Add a variant to a product', security: auth, parameters: [pathParam('id')], requestBody: body({ type: 'object' }), responses: { 201: ok('Created') } },
  },
  '/admin/variants/{id}': {
    patch: { tags: ['Admin'], summary: 'Update variant (price/stock/attributes)', security: auth, parameters: [pathParam('id')], requestBody: body({ type: 'object' }), responses: { 200: ok('Updated') } },
  },
  '/admin/categories': {
    get: { tags: ['Admin'], summary: 'Flat category list', security: auth, responses: { 200: ok('Categories') } },
    post: { tags: ['Admin'], summary: 'Create category', security: auth, requestBody: body({ type: 'object' }), responses: { 201: ok('Created') } },
  },
  '/admin/categories/{id}': {
    patch: { tags: ['Admin'], summary: 'Update category', security: auth, parameters: [pathParam('id')], requestBody: body({ type: 'object' }), responses: { 200: ok('Updated') } },
    delete: { tags: ['Admin'], summary: 'Delete empty category', security: auth, parameters: [pathParam('id')], responses: { 200: ok('Deleted'), 422: errors.Unprocessable } },
  },
  '/admin/brands': {
    get: { tags: ['Admin'], summary: 'All brands', security: auth, responses: { 200: ok('Brands') } },
    post: { tags: ['Admin'], summary: 'Create brand', security: auth, requestBody: body({ type: 'object' }), responses: { 201: ok('Created') } },
  },
  '/admin/orders': {
    get: { tags: ['Admin'], summary: 'All orders (filter by status / order number)', security: auth, parameters: [queryParam('status', { type: 'string' }), queryParam('q', { type: 'string' }), ...pageParams], responses: { 200: list('#/components/schemas/Order') } },
  },
  '/admin/orders/{id}/status': {
    patch: { tags: ['Admin'], summary: 'Update order status (cancel restocks & refunds)', security: auth, parameters: [pathParam('id')], requestBody: body(obj({ status: { type: 'string' } }, ['status'])), responses: { 200: ok('Updated') } },
  },
  '/admin/coupons': {
    get: { tags: ['Admin', 'Coupons'], summary: 'List coupons', security: auth, responses: { 200: ok('Coupons') } },
    post: { tags: ['Admin', 'Coupons'], summary: 'Create coupon', security: auth, requestBody: body({ $ref: '#/components/schemas/Coupon' }), responses: { 201: ok('Created'), 409: errors.Conflict } },
  },
  '/admin/coupons/{code}': {
    patch: { tags: ['Admin', 'Coupons'], summary: 'Update coupon', security: auth, parameters: [pathParam('code')], requestBody: body({ type: 'object' }), responses: { 200: ok('Updated') } },
    delete: { tags: ['Admin', 'Coupons'], summary: 'Delete coupon', security: auth, parameters: [pathParam('code')], responses: { 200: ok('Deleted') } },
  },
  '/admin/users': {
    get: { tags: ['Admin'], summary: 'List users with order counts', security: auth, parameters: pageParams, responses: { 200: ok('Users') } },
  },
} as const;
