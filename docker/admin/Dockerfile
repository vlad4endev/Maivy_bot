# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

COPY admin/package.json admin/package-lock.json ./
RUN npm ci

COPY admin/tsconfig.json admin/index.html admin/vite.config.ts ./
COPY admin/src ./src

RUN npm run build

FROM nginx:alpine AS production

COPY docker/nginx/admin.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
