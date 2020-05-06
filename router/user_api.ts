import { User } from '../entity/user'
import { Router } from 'express'
import { getConnection } from 'typeorm'
import { ReqRegister, ReqLogin } from '../types'
import { validateOrReject } from 'class-validator'
import { plainToClass } from 'class-transformer'

const router = Router()

router.post('/register', async (req, res) => {
  const data = plainToClass(ReqRegister, req.body)
  try {
    await validateOrReject(data)
  } catch (errors) {
    return res.status(400).json({ error: 'Invalid request body' })
  }
  const users = getConnection().getRepository(User)
  if (await users.findOne({ phone: data.phone })) {
    return res.status(403).json({ error: 'Cannot register twice' })
  }
  const user = users.create(data)
  const results = await users.save(user)
  return res.json(results)
})

router.post('/login', async (req, res) => {
  const data = plainToClass(ReqLogin, req.body)
  try {
    await validateOrReject(data)
  } catch (err) {
    return res.status(400).json({ error: err })
  }
  const users = getConnection().getRepository(User)
  const user = await users.findOne({ username: data.username })
  if (user) {
    if (user.password === data.password) {
      return res.status(201).json({ msg: 'Login succeeded' })
    } else {
      return res.status(400).json({ msg: 'Wrong password' })
    }
  } else {
    return res.status(404).json({ error: `User ${data.username} not found` })
  }
})

router.get('/:uid', async (req, res) => {
  try {
    const uid = parseInt(req.param['uid'])
    const users = getConnection().getRepository(User)
    const user = await users.findOne({ id: uid })
    if (user) {
      return res.json(user)
    } else {
      return res.status(404).json({ error: 'User not found' })
    }
  } catch (err) {
    return res.status(404).json({ error: err })
  }
})

router.post('/', (req, res) => {})

export default router
