# ==========================================
# Dockerfile para Tech_Soluciones Frontend
# ==========================================

FROM node:20-slim

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias del proyecto
RUN npm ci

# Copiar todo el código fuente del proyecto
COPY . .

# Argumentos de construcción (Build-time Args) para inyectar variables de Vite en el bundle
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL
ARG VITE_API_BASE_URL

# Exponer las variables de entorno para que Vite las lea durante 'npm run build'
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Compilar para producción (genera dist/client y dist/server)
RUN npm run build

# Exponer el puerto por el que corre el servidor de producción (vite preview)
EXPOSE 3000

# Iniciar la aplicación en modo producción sirviendo la compilación
CMD ["npx", "vite", "preview", "--port", "3000", "--host", "0.0.0.0"]
