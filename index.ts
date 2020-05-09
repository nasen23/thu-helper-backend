import * as express from 'express'
import * as bodyParser from 'body-parser'
import router from './router'
import { getConnectionOptions, createConnection } from 'typeorm'
import * as morgan from 'morgan'
import * as session from 'express-session'
import 'reflect-metadata'

;(async () => {
  const connectionOptions = await getConnectionOptions()
  if (process.env.DATABASE_HOST) {
    Object.assign(connectionOptions, { host: process.env.DATABASE_HOST })
  }

  createConnection(connectionOptions)
    .then(_ => {
      const app: express.Application = express()

      app.use(morgan('dev'))
      app.use(bodyParser.json())
      app.use(
        (
          err: Error,
          _req: express.Request,
          res: express.Response,
          next: express.NextFunction
        ) => {
          if (err instanceof SyntaxError) {
            res.sendStatus(400)
          } else {
            next()
          }
        }
      )

      app.use(
        session({
          secret: 'thu_helper',
          cookie: { maxAge: 60000 },
          resave: false,
          saveUninitialized: false,
        })
      )

      app.use(router)

      // catching 404
      app.use((_, res) => {
        res.status(404).send('Not Found')
      })

      app.listen(process.env.PORT || 3000, () => {
        console.log('App running on port 3000')
      })
    })
    .catch(err => console.log(err))
})()
