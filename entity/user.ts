import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  RelationId,
  ManyToMany,
  JoinTable,
  ManyToOne,
} from 'typeorm'
import { Task } from './task'
import { Message } from './message'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 10 })
  username: string

  @Column({ length: 64 })
  password: string

  @Column({ length: 11 })
  phone: string

  @Column({ length: 6, nullable: true })
  realname: string

  @Column({ nullable: true })
  signature: string

  @Column({ length: 20, nullable: true })
  department: string

  @Column({ length: 4, nullable: true })
  grade: string

  @Column({ length: 20, nullable: true })
  dormitory: string

  @Column({ length: 50, nullable: true })
  wechat: string

  @Column({ length: 50, nullable: true })
  email: string

  @OneToMany(() => Task, task => task.publisher)
  published_tasks: Task[]

  @ManyToMany(() => Task, task => task.doing_users, {
    cascade: true,
  })
  @JoinTable()
  doing_tasks: Task[]

  @ManyToMany(() => Task, task => task.moderating_users, {
    cascade: true,
  })
  @JoinTable()
  moderating_tasks: Task[]

  @ManyToMany(() => Task, task => task.failed_users, {
    cascade: true,
  })
  @JoinTable()
  failed_tasks: Task[]

  @ManyToMany(() => Task, task => task.rewarded_users, {
    cascade: true,
  })
  @JoinTable()
  rewarded_tasks: Task[]

  @OneToMany(() => Message, message => message.sender)
  sent_msgs: Message[]

  @OneToMany(() => Message, message => message.receiver)
  received_msgs: Message[]

  // timestamp of the last avatar modification time
  @Column({ default: '' })
  avatar_ts: string

  // timestamp of the last profile background modification time
  @Column({ default: '' })
  bg_ts: string
}
