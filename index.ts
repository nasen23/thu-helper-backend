import * as express from 'express'
import * as bodyParser from 'body-parser'
import router from './router'
import { createConnection } from 'typeorm'
import * as morgan from 'morgan'

createConnection()
  .then(_ => {
    const app: express.Application = express()

    app.use(morgan('dev'))
    app.use(bodyParser.json())

    app.use(router)

    app.listen(process.env.PORT || 3000, () => {
      console.log('App running on port 3000')
    })
  })
  .catch(err => console.log(err))
