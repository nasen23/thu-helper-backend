import {
  Length,
  MaxLength,
  IsOptional,
  IsIn,
  IsNumberString,
} from 'class-validator'

export class ReqRegister {
  @IsNumberString()
  @Length(11, 11)
  phone: string

  @Length(5, 16)
  password: string

  @Length(2, 10)
  username: string
}

export class ReqLogin {
  @IsNumberString()
  @Length(11, 11)
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

export class ReqNewTask {
  @Length(2, 20)
  title: string

  @IsIn(['community', 'meal', 'study', 'questionnaire'])
  type: string

  description: string

  reward: string

  start_time: string

  end_time: string

  @IsOptional()
  times_per_user: number

  @IsOptional()
  times_total: number

  review_time: string

  @IsOptional()
  site: string

  @IsOptional()
  food_num: number

  @IsOptional()
  subjects: string

  @IsOptional()
  demands: string

  @IsOptional()
  link: string
}
