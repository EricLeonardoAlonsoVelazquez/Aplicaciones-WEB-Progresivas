FROM node:18-alpine

# Crear estructura de directorios como en desarrollo
WORKDIR /app/backend

# Copiar e instalar backend
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

# Crear directorio frontend al nivel correcto (../frontend desde backend/)
WORKDIR /app
COPY frontend/ ./frontend/

WORKDIR /app/backend

# Verificar
RUN echo "=== Desde backend/ ===" && \
    ls -la && \
    echo "=== Frontend (../frontend) ===" && \
    ls -la ../frontend/

EXPOSE 3000

CMD ["node", "server.js"]
