FROM node:20-alpine AS builder

WORKDIR /app

ENV OPENAI_API_KEY=dummy

# Bağımlılık dosyalarını kopyala
COPY package.json package-lock.json ./

# Production için kurulum
# Not: Lokalde package.json ve package-lock tam senkron olmayabildiği için
# Docker build sırasında "npm ci" yerine "npm install" kullanıyoruz.
RUN npm install

# Uygulama kodunu kopyala
COPY . .

# Next.js production build
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Sadece runtime için gerekenleri kopyala
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

# Next.js varsayılan portu
EXPOSE 3000

# Production start komutu
CMD ["npm", "run", "start"]

