FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Railway sets PORT at runtime; nginx must listen there or you get "Application failed to respond".
EXPOSE 80
CMD ["/bin/sh", "-c", "if [ -z \"$PORT\" ]; then export PORT=80; fi && sed -i \"s/listen 80;/listen ${PORT};/\" /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
