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
const upload = multer({
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

router.post('/', checkJWT, async (req, res) => {
  const profile = plainToClass(ReqSetProfile, req.body)
  try {
    await validateOrReject(profile)
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body' })
  }
  const id = res.locals.userid
  const users = getConnection().getRepository(User)
  try {
    await users.update({ id: id }, profile)
    const updated = users.findOne({ id: id })
    return res.json({ ...updated, password: undefined })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid update request' })
  }
})

router.post(
  '/avatar',
  [checkJWT, upload.single('file')],
  (req: Request, res: Response) => {
    const id = res.locals.userid
    const filename = id + '.png'
    const dir = path.join(staticDir, 'avatar')
    const oldFilepath = path.join(dir, req.file.filename)
    const filepath = path.join(dir, filename)
    fs.rename(oldFilepath, filepath, err => {
      if (err) {
        console.log(err)
        res.sendStatus(500)
      } else {
        res.sendStatus(201)
      }
    })
  }
)

export default router
