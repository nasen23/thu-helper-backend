import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'
import { Task } from './task'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 10 })
  username: string

  @Column({ length: 32 })
  password: string

  @Column({ length: 11 })
  phone: string

  @Column({ length: 6, nullable: true })
  realname: string

  @Column({ length: 100, nullable: true })
  avatarUrl: string

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

  @OneToMany(type => Task, task => task.publisher)
  tasks: Task[]
}
