# Etapa 1: Construção
FROM node:18 AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

# Etapa 2: Imagem Final
FROM node:18

WORKDIR /app

COPY --from=builder /app /app

RUN npm install --omit=dev

EXPOSE 5000

CMD ["node", "dist/index.js"]