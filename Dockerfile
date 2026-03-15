FROM node:18-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

WORKDIR .
COPY frontend/ ./frontend/

WORKDIR /app/backend

RUN echo "=== Desde backend/ ===" && \
    ls -la && \
    echo "=== Frontend (../frontend) ===" && \
    ls -la ../frontend/

EXPOSE 3000

CMD ["node", "server.js"]

