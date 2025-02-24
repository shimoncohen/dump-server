FROM node:20

WORKDIR /usr/app

COPY ./package*.json ./
COPY ./.husky ./.husky

RUN npm install
COPY . .

ENTRYPOINT ["node", "--require", "ts-node/register", "./node_modules/typeorm/cli.js"]
CMD ["migration:run"]
