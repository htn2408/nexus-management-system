FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Khi chưa cấu hình SMTP, email được ghi ra logs/emails; user node phải ghi được vào đó.
RUN mkdir -p logs/emails && chown -R node:node logs

USER node
EXPOSE 5105
CMD ["node", "src/server.js"]
