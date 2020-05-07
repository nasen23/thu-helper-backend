import { Length } from 'class-validator'

export class ReqRegister {
  @Length(11, 11)
  phone: string

  @Length(5, 16)
  password: string

  @Length(2, 10)
  username: string
}

export class ReqLogin {
  @Length(11, 11)
  phone: string

  @Length(5, 16)
  password: string
}
