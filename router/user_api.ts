import { User } from '../entity/user'
import { Router } from 'express'
import { getConnection } from 'typeorm'
import { ReqRegister, ReqLogin } from '../types'
import { validateOrReject } from 'class-validator'
import { plainToClass } from 'class-transformer'
import { JWT, checkJWT } from './auth'
import { sha256 } from 'js-sha256'
import { urlencoded } from 'body-parser'

const router = Router()

router.post('/register', urlencoded({ extended: true }), async (req, res) => {
  const data = plainToClass(ReqRegister, req.body)
  try {
    await validateOrReject(data)
  } catch (errors) {
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
  return res.status(201).json(results)
})

router.post('/login', urlencoded({ extended: true }), async (req, res) => {
  const data = plainToClass(ReqLogin, req.body)
  try {
    await validateOrReject(data)
  } catch (errors) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const users = getConnection().getRepository(User)
  const user = await users.findOne({ phone: data.phone })
  if (user) {
    if (user.password === sha256(data.password)) {
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
    const uid = parseInt(req.params['uid'])
    const users = getConnection().getRepository(User)
    const user = await users.findOne({ id: uid })
    if (user) {
      // TODO: don't return password
      return res.json(user)
    } else {
      return res.status(404).json({ error: 'User not found' })
    }
  } catch (err) {
    return res.status(400).json({ error: 'Incorrect user id format' })
  }
})

export default router
