FROM node:14
ENV DATABASE_HOST pgdb
WORKDIR /code
COPY . .
RUN yarn install --registry https://registry.npm.taobao.org
EXPOSE 3000
CMD ["yarn", "start"]

