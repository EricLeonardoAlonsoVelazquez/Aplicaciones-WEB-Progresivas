FROM node:18-alpine

WORKDIR /app

# Copiar backend
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

# Copiar frontend a la raíz del app
COPY frontend/ ./frontend/

RUN mkdir -p /app/config && \
    chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]
