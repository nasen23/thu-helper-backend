import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user'

export enum MessageType {
  text = 'text',
  image = 'image',
}

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => User, user => user.sent_msgs)
  @JoinColumn({ name: 'senderId' })
  sender: User

  @Column({ nullable: false })
  senderId: number

  @ManyToOne(() => User, user => user.received_msgs)
  receiver: User

  @Column('enum', { enum: MessageType })
  type: MessageType

  @Column('text')
  content: string

  // time the message arrives at server
  @Column()
  time: number
}
