FROM node:14
ENV DATABASE_HOST pgdb
WORKDIR /code
COPY . .
RUN mkdir -p public/avatar
RUN yarn install --registry https://registry.npm.taobao.org
EXPOSE 3000 8080
CMD ["yarn", "start"]
