FROM node:20-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
EXPOSE 4003
CMD ["node", "src/index.js"]
