FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependencias del backend
COPY backend/package*.json ./
RUN npm install

# Copiar solo los archivos del backend (sin la carpeta backend/)
COPY backend/ ./

# Crear directorio para frontend al mismo nivel que app
WORKDIR /
COPY frontend/ /frontend/

# Volver al directorio de trabajo
WORKDIR /app

# Verificar estructura
RUN echo "=== Verificando estructura ===" && \
    ls -la /app/ && \
    echo "=== Contenido de /frontend/ ===" && \
    ls -la /frontend/

# Crear directorio de config y ajustar permisos
RUN mkdir -p /app/config && \
    chown -R node:node /app /frontend

USER node

EXPOSE 3000

CMD ["node", "server.js"]
