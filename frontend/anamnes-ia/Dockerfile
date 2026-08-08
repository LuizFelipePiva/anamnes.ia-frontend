# =============================================
# Stage 1: builder — compila o app Vite
# =============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci

# Copia o código-fonte
COPY . .

# Variáveis VITE_* são baked no build; passadas via --build-arg
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build


# =============================================
# Stage 2: development — hot reload via vite dev
# =============================================
FROM node:22-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Código montado via volume no docker-compose
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# =============================================
# Stage 3: production — nginx serve static
# =============================================
FROM nginx:1.27-alpine AS production

# Config nginx customizado (SPA routing + proxy /api)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build do stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
