FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# npm ci runs `prisma generate`, which reads DATABASE_URL from prisma.config.ts but never connects.
RUN DATABASE_URL=postgresql://build@localhost/build npm ci
COPY tsconfig.json ./
COPY src ./src
RUN DATABASE_URL=postgresql://build@localhost/build npm run build && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=5s --timeout=3s --retries=20 CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/scripts/seed.js && node dist/server.js"]
