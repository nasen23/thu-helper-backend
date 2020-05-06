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
    res.locals.userid = jwtPayload.userid
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  next()
}
