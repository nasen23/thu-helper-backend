import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, ManyToOne } from 'typeorm'
import { User } from './user'

export enum MessageType {
  text = 'text',
  image = 'image',
}

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => User, user => user.sent_msgs, { cascade: true })
  sender: User

  @ManyToOne(() => User, user => user.received_msgs, { cascade: true })
  receiver: User

  @Column('enum', { enum: MessageType })
  type: MessageType

  @Column('text')
  content: string

  // time the message arrives at server
  @Column()
  time: string
}
