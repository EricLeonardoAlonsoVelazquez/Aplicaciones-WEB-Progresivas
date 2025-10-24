FROM node:18-alpine

WORKDIR /app

# Copiar backend primero
COPY backend/package*.json ./
RUN npm install

# Copiar el resto del backend
COPY backend/ ./

# Copiar frontend para que Express pueda servirlo
COPY frontend/ ./frontend/

# Crear estructura de carpetas y permisos
RUN mkdir -p /app/frontend && \
    chown -R node:node /app

USER node

# Cambiar el puerto a 3001 para evitar conflictos
EXPOSE 3001

# Health check corregido
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Comando de inicio
CMD ["node", "server.js"]