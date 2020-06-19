import { User } from '../entity/user'
import { Router } from 'express'
import { getConnection } from 'typeorm'
import { ReqRegister, ReqLogin } from '../types'
import { validateOrReject } from 'class-validator'
import { plainToClass } from 'class-transformer'
import { JWT, checkJWT } from './auth'
import { sha256 } from 'js-sha256'
import { urlencoded } from 'body-parser'
import * as path from 'path'
import { staticDir } from '../config'
import { Task } from '../entity/task'

const router = Router()

function hasEnded(task: Task): boolean {
  return (
    task.end_time >= new Date().toString() ||
    task.times_finished >= task.times_total
  )
}

router.post('/register', urlencoded({ extended: true }), async (req, res) => {
  const data = plainToClass(ReqRegister, req.body)
  try {
    await validateOrReject(data)
  } catch (errors) {
    console.log(errors)
    return res.status(400).json({ error: 'Invalid request body' })
  }
  const users = getConnection().getRepository(User)
  if (
    await users.findOne({
      where: [{ phone: data.phone }, { username: data.username }],
    })
  ) {
    return res.status(403).json({ error: 'Cannot register twice' })
  }
  const user = users.create(data)
  user.password = sha256(user.password)
  const results = await users.save(user)
  return res.status(201).json({
    id: results.id,
  })
})

router.post('/login', urlencoded({ extended: true }), async (req, res) => {
  const data = plainToClass(ReqLogin, req.body)
  try {
    await validateOrReject(data)
  } catch (errors) {
    console.log(errors)
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const users = getConnection().getRepository(User)
  const user = await users.findOne({ phone: data.phone })
  if (user) {
    if (user.password === sha256(data.password)) {
      const jwt = new JWT(user)
      return res.status(201).json({
        token: jwt.token,
        userId: user.id,
      })
    } else {
      return res.status(403).json({ error: 'Incorrect password' })
    }
  } else {
    return res.status(404).json({ error: 'User does not exist' })
  }
})

router.get('/:uid/profile', async (req, res) => {
  let uid: number
  try {
    uid = parseInt(req.params['uid'])
  } catch (err) {
    return res.status(400).json({ error: 'Bad request params' })
  }

  const users = getConnection().getRepository(User)
  const user = await users.findOne(uid, {
    relations: [
      'doing_tasks',
      'failed_tasks',
      'rewarded_tasks',
      'moderating_tasks',
    ],
  })
  delete user.password
  if (user) {
    // return everything except password
    if (Object.keys(req.query).length !== 0) {
      let result = {}
      for (const key in req.query) {
        if (user.hasOwnProperty(key)) {
          result[key] = user[key]
        }
      }
      return res.json(result)
    }
    return res.json({ ...user })
  } else {
    return res.status(404).json({ error: 'User not found' })
  }
})

router.get('/:uid/avatar', (req, res) => {
  try {
    const id = parseInt(req.params['uid'])
    const filename = id.toString() + '.png'
    return res.sendFile(
      filename,
      {
        root: path.join(staticDir, 'avatar'),
      },
      err => {
        if (err) {
          res.status(404).json({ error: 'Avatar not found' })
        }
      }
    )
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Invalid request params' })
  }
})

router.get('/:uid/background', (req, res) => {
  try {
    const id = parseInt(req.params['uid'])
    const filename = 'bg' + id.toString() + '.png'
    return res.sendFile(
      filename,
      {
        root: path.join(staticDir, 'background'),
      },
      err => {
        if (err) {
          res.status(404).json({ error: 'Background not found' })
        }
      }
    )
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Invalid request params' })
  }
})

router.post(
  '/modify',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const data = req.body
    const users = getConnection().getRepository(User)
    const user = res.locals.user as User

    const fields = ['username', 'signature']

    for (const field of fields) {
      if (data[field]) {
        user[field] = data[field]
      }
    }
    await users.save(user)
    return res.status(201).json({ msg: 'succeeded!' })
  }
)

router.post(
  '/modify-pwd',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const data = req.body
    const userRepo = getConnection().getRepository(User)
    const user = res.locals.user as User
    const oldPwd = data['oldPwd']
    const newPwd = data['newPwd']

    if (user.password !== sha256(oldPwd)) {
      return res.status(400).json({ error: 'Incorrect password' })
    }
    user.password = sha256(newPwd)
    await userRepo.save(user)
    return res.status(201).json({ msg: 'success' })
})

router.post('/forget-pwd', urlencoded({ extended: true }), async (req, res) => {
  const data = plainToClass(ReqLogin, req.body)
  try {
    await validateOrReject(data)
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Invalid reqeust parameters' })
  }

  const userRepo = getConnection().getRepository(User)
  const user = await userRepo.findOne({ phone: data.phone })
  if (user) {
    const jwt = new JWT(user)
    return res.status(201).json({
      token: jwt.token,
      userId: user.id,
      username: user.username
    })
  } else {
    return res.status(404).json({ err: 'User does not exist' })
  }
})

router.get('/task-states', [checkJWT, urlencoded({ extended: true })], async (req, res) => {
  const uid = res.locals.userid
  const userRepo = getConnection().getRepository(User)
  const user = await userRepo.findOne(uid, {
    relations: [
      'published_tasks',
      'doing_tasks',
      'failed_tasks',
      'rewarded_tasks']
  })
  let taken_done = 0
  let taken_doing = 0
  let published_done = 0
  let published_doing = 0

  for (const task of user.published_tasks) {
    if (hasEnded(task)) {
      published_done++
    } else {
      published_doing++
    }
  }
})

router.get(
  '/task-states',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const uid = (res.locals.user as User).id
    const userRepo = getConnection().getRepository(User)
    const user = await userRepo.findOne(uid, {
      relations: [
        'published_tasks',
        'doing_tasks',
        'failed_tasks',
        'rewarded_tasks',
      ],
    })
    let taken_done = 0
    let taken_doing = 0
    let published_done = 0
    let published_doing = 0

    for (const task of user.published_tasks) {
      if (hasEnded(task)) {
        published_done++
      } else {
        published_doing++
      }
    }

    taken_doing = user.doing_tasks.length
    taken_done = user.failed_tasks.length + user.rewarded_tasks.length

    return res.status(200).json({
      taken_done,
      taken_doing,
      published_done,
      published_doing,
    })
  }
)

export default router
