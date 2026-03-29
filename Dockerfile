FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/
COPY package.json ./

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]
