FROM node:24.19.0-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev && mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/data/enem.sqlite
EXPOSE 3000
CMD ["node", "server/app.js"]
