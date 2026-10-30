# ===== Build stage =====
FROM node:22-alpine AS build
WORKDIR /app

# Dùng pnpm (phiên bản ghim trong packageManager của package.json)
RUN corepack enable

# Cài dependency trước để tận dụng cache layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Vite reads this value at build time. Empty means same-origin nginx proxy.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

# Copy source và build
COPY . .
RUN pnpm run build

# ===== Runtime stage =====
FROM nginx:alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
