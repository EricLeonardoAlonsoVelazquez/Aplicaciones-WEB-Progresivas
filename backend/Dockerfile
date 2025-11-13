FROM node:18-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

RUN mkdir -p /app/backend/config && \
    chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]
