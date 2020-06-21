import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm'
import { User } from './user'

export enum MessageType {
  text = 'text',
  image = 'image',
}

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToMany(() => User, user => user.sent_msgs)
  sender: User

  @ManyToMany(() => User, user => user.received_msgs)
  receiver: User

  @Column('enum', { enum: MessageType })
  type: MessageType

  @Column('text')
  content: string

  // time the message arrives at server
  @Column()
  time: string
}
