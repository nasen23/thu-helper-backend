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
      console.log('message: ' + msg)
      const json = JSON.parse(msg)
      const info = plainToClass(WsMessage, json)
      await validateOrReject(info)
      console.log('info: ' + info)
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
      await messages.save(message)

      const toWs = connections.get(info.to)
      console.log(1)
      // send if the receiver is currently online
      if (toWs) {
        console.log(2)
        toWs.send({
          id: message.id,
          from: user.id,
          senderName: user.username,
          type: info.type,
          content: info.content,
          time: message.time,
        })
      }
    } catch (err) {
      console.log(err)
      return
    }
  })
  ws.on('close', () => {
    connections.delete(user.id)
    ws.close()
  })
})

const router = Router()

router.get('/sent', checkJWT, async (req, res) => {
  const timestamp = req.query['since'] as string
  const receiverId = parseInt(req.query['receiver'] as string)
  const date = new Date(timestamp)
  const uid = (res.locals.user as User).id
  const msgs = getConnection().getRepository(Message)

  const query = msgs
    .createQueryBuilder('msg')
    .leftJoinAndSelect('msg.sender', 'sender')
    .leftJoinAndSelect('msg.receiver', 'receiver')
    .where('sender.id = :uid', { uid: uid })
    .andWhere('receiver.id = :rid', { rid: receiverId })
    .select('msg.id')
    .addSelect('msg.type')
    .addSelect('msg.content')
    .addSelect('msg.time')
  // .leftJoinAndSelect('user.sent_msgs', 'message')
  // // .where('message.receiver = :id', { id: receiverId })
  // .where('user.id = :uid', { uid: uid })
  // .select('sent_msgs')

  if (date instanceof Date && !isNaN(date.getTime())) {
    const results = await query
      .andWhere('message.time > :date', { date: date.getTime() })
      .getMany()
    return res.status(200).json(results)
  } else {
    const results = await query.getMany()
    console.log(results)
    return res.status(200).json(results)
  }
})

// Get all messages or some messages since some time
// http get params
// since: number (should provide me a timestamp with unit of millisecond`second * 1000`)
router.get('/message', checkJWT, async (req, res) => {
  const timestamp = req.query['since'] as string
  const date = new Date(timestamp)
  const user = res.locals.user as User
  console.log(req.query)
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
    console.log(results)
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
    console.log(results)
    return res.json(results)
  }
})

export default router
