FROM node:18-alpine

WORKDIR /app

# Copiar backend
COPY backend/package*.json ./
RUN npm install

# Copiar backend completo
COPY backend/ ./

# Copiar frontend a /app/frontend (mismo nivel que server.js)
COPY frontend/ ./frontend/

# Verificar estructura
RUN echo "=== Estructura final ===" && \
    ls -la && \
    echo "=== Frontend ===" && \
    ls -la frontend/

# Crear directorios necesarios
RUN mkdir -p config

EXPOSE 3000

CMD ["node", "server.js"]
