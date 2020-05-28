import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { User } from './user'

@Entity()
export class Task {
  /* for general tasks */

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

  @Column({ type: 'timestamp', nullable: true })
  end_time: string

  @Column('interval', { nullable: true })
  duration: string

  // number of times each user can finish this task
  @Column({ nullable: true })
  times_per_person: number

  // number of times this task is expected to be finished
  @Column({ nullable: true })
  times_total: number

  // employer review time
  @Column({ type: 'interval' })
  review_time: string

  @ManyToOne(type => User, publisher => publisher.tasks)
  publisher: User

  /* for meal tasks */

  // which dining hall
  @Column({ nullable: true })
  site: string

  // number of meals
  @Column({ nullable: true })
  food_num: number

  /* for study tasks */

  // subjects involved
  @Column({ nullable: true })
  subjects: string

  /* for quetionnaire tasks */

  // demands for filling out the questionnaire
  @Column({ nullable: true })
  demands: string

  // questionnaire link, starting with 'http' or 'https'
  @Column({ nullable: true })
  link: string
}
