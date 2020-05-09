import {
  Length,
  MaxLength,
  IsOptional,
  IsPhoneNumber,
  IsIn,
} from 'class-validator'

export class ReqRegister {
  @Length(11, 11)
  phone: string

  @Length(5, 16)
  password: string

  @Length(2, 10)
  username: string
}

export class ReqLogin {
  @IsPhoneNumber('CH')
  phone: string

  @Length(5, 16)
  password: string
}

export class ReqSetProfile {
  @IsOptional()
  @Length(1, 6)
  realname?: string

  @IsOptional()
  @MaxLength(200)
  signature?: string

  @IsOptional()
  @Length(2, 20)
  department?: string

  @IsOptional()
  @IsIn(['大一', '大二', '大三', '大四'])
  grade?: string

  @IsOptional()
  @Length(2, 10)
  dormitory?: string

  @IsOptional()
  @Length(2, 30)
  wechat?: string

  @IsOptional()
  @Length(4, 40)
  email?: string
}
