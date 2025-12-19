# Stage 1: Build
FROM node:20-alpine as build
WORKDIR /app

# Build argument for API URL
ARG API_URL=/api

COPY package*.json ./
RUN npm install
COPY . .

# Build the Angular app
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
RUN chmod 755 /usr/share/nginx/html && chown -R nginx:nginx /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
