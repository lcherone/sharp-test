FROM node:lts-slim

ENV NODE_ENV production

WORKDIR /usr/src/app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production --silent && mv node_modules ../

COPY . .
EXPOSE 3000
CMD node index.js