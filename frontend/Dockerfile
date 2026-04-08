# syntax=docker/dockerfile:1.7

FROM node:20.19.0-alpine3.21 AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:20.19.0-alpine3.21 AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27.5-alpine AS runtime

COPY --chown=101:101 --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
