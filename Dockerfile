FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependencias del backend
COPY backend/package*.json ./
RUN npm install

# Copiar todo el backend
COPY backend/ ./

# Copiar el frontend a /app/frontend/
COPY frontend/ ./frontend/

# Verificar que los archivos se copiaron correctamente
RUN echo "=== Verificando estructura ===" && \
    ls -la /app/ && \
    echo "=== Contenido de frontend/ ===" && \
    ls -la /app/frontend/

# Crear directorio de config y ajustar permisos
RUN mkdir -p /app/config && \
    chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]
