# Frontend Dockerfile (Angular build + Nginx serve)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist/sonrisalud-frontend /usr/share/nginx/html

# Basic Nginx config (optional: can be extended to proxy APIs)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

