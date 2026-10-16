# MehrWearingShop API - multi-stage Docker build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --omit=dev=false

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY package.json ./
EXPOSE 4000
# Run pending migrations, then start the API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
