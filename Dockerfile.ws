FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig*.json ./
COPY src/server ./src/server
COPY src/types ./src/types

RUN npm install -D tsx

CMD ["npx", "tsx", "src/server/socket.ts"]

EXPOSE 8080
