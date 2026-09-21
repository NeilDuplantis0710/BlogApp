FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm ci
COPY . .
EXPOSE 8000
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm ci --omit=dev
COPY . .
EXPOSE 8000
CMD ["node", "src/index.js"]