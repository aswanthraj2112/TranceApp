FROM node:18-alpine AS base
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm install --production --ignore-scripts || npm install --production --ignore-scripts
COPY src ./src
EXPOSE 8080
CMD ["npm", "start"]
