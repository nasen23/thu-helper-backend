import { Router, Request, Response } from 'express'
import { checkJWT } from './auth'
import { validateOrReject } from 'class-validator'
import { plainToClass } from 'class-transformer'
import { ReqSetProfile } from '../types'
import { getConnection } from 'typeorm'
import { User } from '../entity/user'
import * as path from 'path'
import * as fs from 'fs'
import * as multer from 'multer'
import { staticDir } from '../config'

const router = Router()
const avatarUpload = multer({
  dest: path.join(staticDir, 'avatar'),
  fileFilter: (_, file, callback) => {
    const extname = path.extname(file.originalname).toLowerCase()
    if (['.png', '.jpg', '.jpeg'].includes(extname)) {
      return callback(null, true)
    }
    callback(new Error('Only images are allowed'))
  },
  limits: {
    fileSize: 512 * 1024,
  },
})
const bgUpload = multer({
  dest: path.join(staticDir, 'background'),
  fileFilter: (_, file, callback) => {
    const extname = path.extname(file.originalname).toLowerCase()
    if (['.png', '.jpg', '.jpeg'].includes(extname)) {
      return callback(null, true)
    }
    callback(new Error('Only images are allowed'))
  },
  limits: {
    fileSize: 512 * 1024,
  },
})

router.post('/', checkJWT, async (req, res) => {
  const profile = plainToClass(ReqSetProfile, req.body)
  try {
    await validateOrReject(profile)
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body' })
  }
  const user = res.locals.user as User
  const users = getConnection().getRepository(User)
  try {
    Object.assign(user, profile)
    await users.save(user)
    return res.json({ ...user, password: undefined })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid update request' })
  }
})

router.post(
  '/avatar',
  [checkJWT, avatarUpload.single('file')],
  (req: Request, res: Response) => {
    const id = (res.locals.user as User).id
    const filename = id + '.png'
    const dir = path.join(staticDir, 'avatar')
    const oldFilepath = path.join(dir, req.file.filename)
    const filepath = path.join(dir, filename)
    fs.exists(filepath, exists => {
      if (exists) {
        fs.unlinkSync(filepath)
      }
    })
    fs.rename(oldFilepath, filepath, async err => {
      if (err) {
        console.log(err)
        res.sendStatus(500)
      } else {
        let users = getConnection().getRepository(User)
        let user = await users.findOne(id)
        user.avatar_ts = Date.parse(new Date().toString()).toString()
        await users.save(user)
        res.sendStatus(201)
      }
    })
  }
)

router.post(
  '/background',
  [checkJWT, bgUpload.single('file')],
  (req: Request, res: Response) => {
    const id = (res.locals.user as User).id
    const filename = 'bg' + id + '.png'
    const dir = path.join(staticDir, 'background')
    const oldFilepath = path.join(dir, req.file.filename)
    const filepath = path.join(dir, filename)
    fs.exists(filepath, exists => {
      if (exists) {
        fs.unlinkSync(filepath)
      }
    })
    fs.rename(oldFilepath, filepath, async err => {
      if (err) {
        console.log(err)
        res.sendStatus(500)
      } else {
        let users = getConnection().getRepository(User)
        let user = await users.findOne(id)
        user.bg_ts = Date.parse(new Date().toString()).toString()
        await users.save(user)
        res.sendStatus(201)
      }
    })
  }
)

export default router
