FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./

FROM base AS dev
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

FROM base AS production
ENV NODE_ENV=production
RUN npm ci
COPY . .
# rootDir is "." so the compiled server lands at dist/src/server.js
RUN npm run build
USER node
EXPOSE 3001
CMD ["node", "dist/src/server.js"]
