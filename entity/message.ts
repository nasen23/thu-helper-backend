import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { User } from './user'

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => User, user => user.sent_msgs)
  sender: User

  @ManyToOne(() => User, user => user.received_msgs)
  receiver: User

  @Column('text')
  content: string

  // time the message arrives at server
  @Column()
  time: Date
}
