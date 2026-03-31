FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Official nginx entrypoint runs envsubst on templates; Railway sets PORT at runtime.
# Default for local/docker-compose when PORT is unset:
ENV PORT=80
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
