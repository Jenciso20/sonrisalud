# Backend Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev

# Copy source code
COPY src ./src
COPY scripts ./scripts

EXPOSE 3000

# Default environment (can be overridden by docker-compose)
ENV PORT=3000 \
    DB_SSL=false

CMD ["node", "src/app.js"]

