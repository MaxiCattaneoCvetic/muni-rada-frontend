FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Vite inyecta import.meta.env solo en build; Railway debe pasar estas vars al paso "docker build"
# (en Variables: disponibles en Build; o coinciden con estos ARG).
ARG VITE_API_URL
ARG VITE_DEMO_MODE
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Official nginx entrypoint runs envsubst on templates; Railway sets PORT at runtime.
# Default for local/docker-compose when PORT is unset:
ENV PORT=80
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
