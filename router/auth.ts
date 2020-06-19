import { getConnection } from 'typeorm'
import * as jwt from 'jsonwebtoken'
import { User } from '../entity/user'
import { secret } from '../config'
import { Request, Response, NextFunction } from 'express'

export class JWT {
  token: string

  constructor(user: User) {
    this.token = jwt.sign(
      { userid: user.id, username: user.username },
      secret,
      {
        expiresIn: '180d',
      }
    )
  }

  public jsonResponse(): object {
    return { token: this.token }
  }
}

export function checkJWT(req: Request, res: Response, next: NextFunction) {
  const token = <string>req.headers['auth']
  try {
    const jwtPayload = <any>jwt.verify(token, secret)
    const userid = parseInt(jwtPayload.userid)
    const users = getConnection().getRepository(User)
    const user = users.findOne(userid)
    res.locals.user = user
    if (!user) {
      throw 'User not found'
    }
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  next()
}

export function verifyJWT(token: string): string {
  try {
    const payload = jwt.verify(token, secret) as any
    return payload.userid
  } catch (err) {
    return null
  }
}
