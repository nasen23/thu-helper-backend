import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
} from 'typeorm'
import { User } from './user'

@Entity()
export class Task {
  /* for general tasks */

  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 20 })
  type: string

  @Column({ length: 20 })
  title: string

  @Column()
  description: string

  @Column('real')
  reward: string

  @Column()
  start_time: string

  @Column()
  end_time: string

  // number of times this task is expected to be finished
  @Column({ nullable: true })
  times_total: number

  // number of times the task has been finished
  @Column({ nullable: true })
  times_finished: number

  // employer review time
  @Column()
  review_time: number

  @Column({ default: 0 })
  view_count: number

  @Column({ nullable: true })
  publisherId: number

  @ManyToOne(type => User, publisher => publisher.published_tasks, {
    cascade: true,
  })
  publisher: User

  @ManyToMany(() => User, user => user.doing_tasks)
  doing_users: User[]

  @ManyToMany(() => User, user => user.moderating_tasks)
  moderating_users: User[]

  @ManyToMany(() => User, user => user.failed_tasks)
  failed_users: User[]

  @ManyToMany(() => User, user => user.rewarded_tasks)
  rewarded_users: User[]

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

  /* for questionnaire tasks */

  // demands for filling out the questionnaire
  @Column({ nullable: true })
  demands: string

  // questionnaire link, starting with 'http' or 'https'
  @Column({ nullable: true })
  link: string
}
