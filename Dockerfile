# Etapa 1: dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiamos los archivos de config de dependencias
COPY package.json package-lock.json* ./

# Instalamos dependencias (producción + dev para poder build)
RUN npm ci

# Etapa 2: build de la app
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Construimos Next en modo producción
RUN npm run build

# Etapa 3: imagen final de runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Usuario no root (mejor práctica)
RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

# Copiamos lo necesario desde el builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/data ./data

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "start"]
