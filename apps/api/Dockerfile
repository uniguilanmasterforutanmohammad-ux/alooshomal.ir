# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN apk add --no-cache openssl libc6-compat postgresql17-client

# ---------- dependencies ----------
FROM base AS deps
ENV NODE_ENV=development
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --include=dev --no-audit --no-fund

# ---------- development ----------
FROM deps AS development
ENV NODE_ENV=development
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

# ---------- build ----------
FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

# ---------- production ----------
FROM base AS production
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
