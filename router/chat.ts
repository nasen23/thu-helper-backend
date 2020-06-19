import { Router } from 'express'
import { getConnection, MoreThan } from 'typeorm'
import { User } from '../entity/user'
import { Message } from '../entity/message'
import * as WebSocket from 'ws'
import { verifyJWT, checkJWT } from './auth'
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
      // find proper user to send to
      const users = getConnection().getRepository(User)
      const receiver = await users.findOne(info.to)
      if (!receiver) {
        return
      }
      const messages = getConnection().getRepository(Message)
      const message = new Message()
      message.sender = user
      message.receiver = receiver
      message.time = new Date()
      message.content = info.msg
      messages.save(message)

      const toWs = connections.get(info.to)
      // send if the receiver is currently online
      if (toWs) {
        toWs.send({ from: user.id, msg: info.msg })
      }
    } catch (err) {
      return
    }
  })
  ws.on('close', () => {
    connections.delete(user.id)
    ws.close()
  })
})

const router = Router()

// Get all messages or some messages since some time
// http get params
// since: number (should provide me a timestamp with unit of millisecond`second * 1000`)
router.get('/message', checkJWT, (req, res) => {
  const date = new Date(req.params['since'])
  const user = res.locals.user as User
  const messages = getConnection().getRepository(Message)
  if (date instanceof Date && !isNaN(date.getTime())) {
    // get message since date
    const results = messages
      .createQueryBuilder('message')
      .innerJoin('message.sender', 'sender', 'sender.id = :id', { id: user.id })
      .innerJoin('message.receiver', 'receiver', 'receiver.id = :id', {
        id: user.id,
      })
      .where('time > :date', { date })
      .getMany()
    return res.json(results)
  } else {
    const results = messages
      .createQueryBuilder('message')
      .innerJoin('message.sender', 'sender', 'sender.id = :id', { id: user.id })
      .innerJoin('message.receiver', 'receiver', 'receiver.id = :id', {
        id: user.id,
      })
      .getMany()
    return res.json(results)
  }
})

export default router
