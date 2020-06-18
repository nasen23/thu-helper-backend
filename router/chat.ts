import { getConnection } from 'typeorm'
import { User } from '../entity/user'
import * as WebSocket from 'ws'
import { verifyJWT } from './auth'
import { validateOrReject } from 'class-validator'
import { plainToClass } from 'class-transformer'
import { WsMessage } from '../types'

let connections = new Map<number, WebSocket>()

const wss = new WebSocket.Server({
  port: 8080,
  verifyClient: async (info, done) => {
    const token = info.req.headers.authorization
    const userid = verifyJWT(token)
    const repo = getConnection().getRepository(User)
    const user = await repo.findOne({ id: parseInt(userid) })
    if (user) {
      info.req['user'] = user
      done(true)
    } else {
      done(false)
    }
  },
})

wss.on('connection', (ws, req) => {
  const user: User = req['user']
  connections.set(user.id, ws)
  ws.on('message', async (msg: string) => {
    try {
      const json = JSON.parse(msg)
      const info = plainToClass(WsMessage, json)
      await validateOrReject(info)
      const toWs = connections.get(info.to)
      if (toWs) {
        toWs.send({ from: user.id, msg: info.msg })
      } else {
        // insert into database
      }
    } catch (err) {
      ws.send({ error: 'Invalid message body' })
    }
  })
  ws.on('close', () => {
    connections.delete(user.id)
    ws.close()
  })
})
