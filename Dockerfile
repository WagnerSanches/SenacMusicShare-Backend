FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./

FROM base AS dev
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS production
ENV NODE_ENV=production
RUN npm ci --only=production
COPY . .
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
