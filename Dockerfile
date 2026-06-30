# ── 阶段 1：构建前端 ──
FROM node:22-alpine AS builder

WORKDIR /app

# 先拷贝依赖清单，利用 Docker 层缓存
COPY package.json package-lock.json* ./
RUN npm ci

# 拷贝源码并构建（生成 dist/）
COPY . .
RUN npm run build-only

# ── 阶段 2：nginx 部署静态资源 ──
FROM nginx:alpine

# 移除默认配置，使用自定义配置
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝构建产物到 nginx 静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
