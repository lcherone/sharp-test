FROM node:lts-slim

RUN apt-get update && apt-get install -y autoconf libtool pkg-config nasm build-essential \
    && apt-get autoremove -y && apt-get autoclean -y && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV NODE_ENV production

WORKDIR /

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production --silent

COPY . .
EXPOSE 3000
CMD node src/index.js