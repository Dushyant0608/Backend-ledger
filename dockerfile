FROM node:24
WORKDIR /FinTrace
COPY package*.json .
RUN npm install
COPY . .
ENV NODE_ENV=production
RUN npx prisma generate
EXPOSE 3000
CMD [ "node" , "server.js" ]
