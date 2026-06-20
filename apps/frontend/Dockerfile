FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/

RUN npm install --workspace=@chat/shared --workspace=@chat/frontend --include-workspace-root

COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

RUN npm run build -w @chat/shared
RUN npm run build -w @chat/frontend

FROM nginx:1.27-alpine AS runner

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
