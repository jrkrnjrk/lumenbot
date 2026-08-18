FROM node:20-alpine

# Install tools needed to compile native modules (bufferutil etc.)
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

CMD ["npm", "start"]
