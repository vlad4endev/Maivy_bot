# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY convex ./convex
COPY docker/convex-init/entrypoint.sh /entrypoint.sh

RUN npm ci && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
