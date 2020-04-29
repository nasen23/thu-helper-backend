import { User } from '../entity/user'
import { Router } from 'express'
import { getConnection } from 'typeorm'

const router = Router()

router.post('/register', async (req, res) => {})

router.post('/login', async (req, res) => {})

router.get('/:uid', async (req, res) => {
  const uid: string = req.param['uid']
  const users = getConnection().getRepository(User)
  const user = await users.findOne(uid)
  if (user) {
    res.json(user)
  } else {
    res.status(404).send('User not found')
  }
})

router.post('/', (req, res) => {})

export default router
