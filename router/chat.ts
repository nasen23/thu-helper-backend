import { Router } from 'express'
import { getConnection } from 'typeorm'
import { User } from '../entity/user'
import { Message, MessageType } from '../entity/message'
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
      message.time = Date.now().toString()
      message.content = info.content
      message.type = MessageType[info.type]
      messages.save(message)

      const toWs = connections.get(info.to)
      // send if the receiver is currently online
      if (toWs) {
        toWs.send({ from: user.id, type: info.type, content: info.content })
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
router.get('/message', checkJWT, async (req, res) => {
  const timestamp = req.query['since'] as string
  const date = new Date(timestamp)
  const user = res.locals.user as User
  const users = getConnection().getRepository(User)
  if (date instanceof Date && !isNaN(date.getTime())) {
    // get message since date
    const results = await users
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.sent_msgs', 'message')
      .where('message.receiver = :id', { id: user.id })
      .andWhere('message.time > :date', { date: date.getTime() })
      .select('user.id')
      .addSelect('user.username')
      .addSelect('message')
      .getMany()
    return res.json(results)
  } else {
    const results = await users
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.sent_msgs', 'message')
      .where('message.receiver = :id', { id: user.id })
      .select('user.id')
      .addSelect('user.username')
      .addSelect('message')
      .getMany()
    return res.json(results)
  }
})

export default router
