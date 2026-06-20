# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

# Monorepo layout: admin imports ../../../convex/_generated from admin/src/*
WORKDIR /app

ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

COPY admin/package.json admin/package-lock.json ./admin/
RUN npm ci --prefix admin

COPY admin/tsconfig.json admin/index.html admin/vite.config.ts ./admin/
COPY admin/src ./admin/src
COPY convex/_generated ./convex/_generated

WORKDIR /app/admin
RUN npm run build

FROM nginx:alpine AS production

COPY docker/nginx/admin.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/admin/dist /usr/share/nginx/html

EXPOSE 80
