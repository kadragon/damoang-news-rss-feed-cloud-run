FROM node:slim

ENV TZ=Asia/Seoul
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends tzdata && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app && chown node:node /app
USER node
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]