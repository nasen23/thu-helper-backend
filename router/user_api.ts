import { User } from '../entity/user'
import { Router } from 'express'
import { getConnection } from 'typeorm'
import { ReqRegister, ReqLogin } from '../types'
import { validateOrReject } from 'class-validator'
import { plainToClass } from 'class-transformer'
import { JWT, checkJWT } from './auth'

const router = Router()

router.post('/register', async (req, res) => {
  const data = plainToClass(ReqRegister, req.body)
  try {
    await validateOrReject(data)
  } catch (errors) {
    return res.sendStatus(400)
  }
  const users = getConnection().getRepository(User)
  if (await users.findOne({ phone: data.phone })) {
    return res.status(403).json({ error: 'Cannot register twice' })
  }
  // TODO: hash the password to store in database
  const user = users.create(data)
  const results = await users.save(user)
  return res.json(results)
})

router.post('/login', async (req, res) => {
  const data = plainToClass(ReqLogin, req.body)
  try {
    await validateOrReject(data)
  } catch (errors) {
    return res.sendStatus(400)
  }

  const users = getConnection().getRepository(User)
  const user = await users.findOne({ phone: data.phone })
  if (user) {
    if (user.password === data.password) {
      const jwt = new JWT(user)
      return res.status(201).json(jwt.jsonResponse())
    } else {
      return res.status(403).json({ error: 'Incorrect password' })
    }
  } else {
    return res.status(404).json({ error: 'User does not exist' })
  }
})

router.get('/:uid', checkJWT, async (req, res) => {
  try {
    const uid = parseInt(req.param['uid'])
    const users = getConnection().getRepository(User)
    const user = await users.findOne({ id: uid })
    if (user) {
      return res.json(user)
    } else {
      return res.sendStatus(404)
    }
  } catch (err) {
    return res.sendStatus(400)
  }
})

export default router
