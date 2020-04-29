import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { User } from './user'

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 10 })
  type: string

  @Column({ length: 20 })
  title: string

  @Column()
  description: string

  @Column({ length: 10 })
  reward: string

  @Column()
  is_proceeding: boolean

  @Column()
  is_done: boolean

  @Column()
  is_paid: boolean

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  start_time: string

  @Column({ type: 'timestamp' })
  end_time: string

  @ManyToOne(type => User, publisher => publisher.tasks)
  publisher: User
}
