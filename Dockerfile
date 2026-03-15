FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy backend files
COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/

# Copy frontend files
COPY frontend/ ./frontend/

# Set working directory to backend for running the server
WORKDIR /app/backend

# Verify the directory structure
RUN echo "=== Desde backend/ ===" && \
    ls -la && \
    echo "=== Frontend (/app/frontend) ===" && \
    ls -la /app/frontend/

EXPOSE 3000

CMD ["node", "server.js"]
