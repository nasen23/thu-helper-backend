import { Router, Request, Response } from 'express'
import { urlencoded } from 'body-parser'
import { ReqNewTask } from '../types'
import { plainToClass } from 'class-transformer'
import { validateOrReject } from 'class-validator'
import { getConnection, Not } from 'typeorm'
import { Task } from '../entity/task'
import { checkJWT } from './auth'
import { User } from '../entity/user'
import { url } from 'inspector'

const router = Router()

function hasEnded(task: Task): boolean {
  return (
    task.end_time <= Date.now().toString() ||
    task.times_finished >= task.times_total
  )
}

function mapUserToId(task: Task): void {
  task.doing_users = Object(task.doing_users.map(user => user.id))
  task.failed_users = Object(task.failed_users.map(user => user.id))
  task.rewarded_users = Object(task.rewarded_users.map(user => user.id))
  task.moderating_users = Object(task.moderating_users.map(user => user.id))
}

router.post(
  '/add',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const data = plainToClass(ReqNewTask, req.body)
    try {
      await validateOrReject(data)
    } catch (errors) {
      console.log(errors)
      return res.status(400).json({ error: 'Invalid request body' })
    }
    const publisher = res.locals.user as User

    data['publisher'] = publisher
    if (data.type == 'meal') {
      data.times_total = 1
    }

    const tasks = getConnection().getRepository(Task)
    const task = tasks.create(data)
    try {
      let result = await tasks.save(task)
      return res.status(201).json({ id: result.id })
    } catch (err) {
      console.log(err)
    }
  }
)

router.get(
  '/get',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const id = req.query['id']
    const tasks = getConnection().getRepository(Task)
    let task = await tasks.findOne(id, {
      relations: [
        'doing_users',
        'moderating_users',
        'failed_users',
        'rewarded_users',
      ],
    })

    if (task) {
      if (req.query['browsing'] === '') {
        task.view_count++
      }
      await tasks.save(task)
      return res.json({ task })
    } else {
      return res.status(404).json({ error: 'Task not found' })
    }
  }
)

router.get(
  '/search',
  [checkJWT, urlencoded({ extended: true })],
  async (req: Request, res: Response) => {
    const user = res.locals.user as User
    const tasks = getConnection().getRepository(Task)
    const q = req.query['q'] as string
    if (!q) {
      return res.status(400).json({ error: 'Invalid request parameters' })
    }
    let query = tasks
      .createQueryBuilder('task')
      .innerJoin('task.publisher', 'publisher')
      .where('publisher.id <> :id', { id: user.id })
      .where('task.title LIKE :query', { query: '%' + q + '%' })
    const ty = req.query['type'] as string
    if (ty && !['community', 'meal', 'study', 'questionnaire'].includes(ty)) {
      return res.status(400).json({ error: 'Invalid request parameters' })
    }
    if (ty) {
      query = query.andWhere('task.type = :ty', { ty })
    }
    const offset = parseInt(req.query['offset'] as string)
    if (!isNaN(offset)) {
      query = query.offset(offset)
    }
    const n = parseInt(req.query['n'] as string)
    if (!isNaN(n)) {
      query = query.take(n)
    }
    const result = await query.getMany()
    return res.json({ tasks: result.filter(task => !hasEnded(task)) })
  }
)

router.post(
  '/modify',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const data = plainToClass(ReqNewTask, req.body)
    try {
      await validateOrReject(data)
    } catch (errors) {
      console.log(errors)
      return res.status(400).json({ error: 'Invalid request parameters' })
    }
    const taskRepo = getConnection().getRepository(Task)
    let task = await taskRepo.findOne(data['taskId'])
    if (task) {
      for (const key in data) {
        if (task.hasOwnProperty(key)) {
          task[key] = data[key]
        }
      }
      await taskRepo.save(task)
      return res.status(201).json({ msg: 'success' })
    } else {
      return res.status(404).json({ error: 'Task not existed' })
    }
  }
)

router.get('/all', [urlencoded({ extended: true })], async (req, res) => {
  const repository = getConnection().getRepository(Task)
  let tasks = await repository.find({
    relations: [
      'doing_users',
      'moderating_users',
      'failed_users',
      'rewarded_users',
    ],
  })
  tasks.forEach(task => {
    mapUserToId(task)
  })
  return res.status(200).json({ tasks })
})

router.get(
  '/others',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const uid = (res.locals.user as User).id
    const type = req.query['type']
    const limit = req.query['limit']
    const taskRepo = getConnection().getRepository(Task)
    const userRepo = getConnection().getRepository(User)
    let query = taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.doing_users', 'doing_users')
      .leftJoinAndSelect('task.failed_users', 'failed_users')
      .leftJoinAndSelect('task.rewarded_users', 'rewarded_users')
      .leftJoinAndSelect('task.moderating_users', 'moderating_users')
      .where('(task.end_time) > (:now)', { now: Date.now().toString() })
      .andWhere('task.publisherId != :uid', { uid: uid })

    if (limit) {
      const cnt = parseInt(limit)
      query = query.orderBy('RANDOM()').limit(cnt)
    }

    if (!type) {
      let tasks = await query.getMany()
      tasks.forEach(task => {
        mapUserToId(task)
      })
      return res.status(200).json({ tasks })
    } else if (['community', 'meal', 'study', 'questionnaire'].includes(type)) {
      let tasks = await query
        .andWhere('task.type = :type', { type: type })
        .getMany()
      tasks.forEach(task => {
        mapUserToId(task)
      })
      return res.status(200).json({ tasks })
    } else if (['doing', 'moderating', 'rewarded', 'failed'].includes(type)) {
      const user = await userRepo.findOne(uid, {
        relations: [
          'doing_tasks',
          'moderating_tasks',
          'failed_tasks',
          'rewarded_tasks',
        ],
      })
      let tasks = []
      switch (type) {
        case 'doing':
          tasks = user.doing_tasks
          break
        case 'moderating':
          tasks = user.moderating_tasks
          break
        case 'rewarded':
          tasks = user.rewarded_tasks
          break
        case 'failed':
          tasks = user.failed_tasks
          break
      }
      return res.status(200).json({ tasks })
    } else {
      return res.status(400).json({ error: 'Invalid query parameters' })
    }
  }
)

router.get(
  '/mine',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const uid = (res.locals.user as User).id
    const type = req.query['type']
    const userRepo = getConnection().getRepository(User)
    const user = await userRepo.findOne(uid, {
      relations: ['published_tasks'],
    })

    let result = []
    if (!type) {
      return res.status(200).json({ tasks: user.published_tasks })
    }

    switch (type) {
      case 'doing':
        for (const task of user.published_tasks) {
          if (!hasEnded(task)) {
            result.push(task)
          }
        }
        return res.status(200).json({ tasks: result })
      case 'done':
        for (const task of user.published_tasks) {
          if (hasEnded(task)) {
            result.push(task)
          }
        }
        return res.status(200).json({ tasks: result })
      default:
        return res.status(400).json({ error: 'Invalid query parameters' })
    }
  }
)

router.post(
  '/take',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const uid = (res.locals.user as User).id
    const tid = req.body['id']
    const taskRepository = getConnection().getRepository(Task)
    const userRepository = getConnection().getRepository(User)

    if ((await taskRepository.count({ id: tid })) == 0) {
      return res.status(404).json({ error: 'Task not exist' })
    }

    let task = await taskRepository.findOne(tid)
    let user = await userRepository.findOne(uid, {
      relations: [
        'doing_tasks',
        'failed_tasks',
        'rewarded_tasks',
        'moderating_tasks',
      ],
    })
    if (
      user.doing_tasks.findIndex(task => task.id == tid) != -1 ||
      user.moderating_tasks.findIndex(task => task.id == tid) != -1
    ) {
      // cannot take twice unless the previous one has finished
      return res.status(400).json({ error: 'Already taken' })
    }
    if (
      user.failed_tasks.findIndex(task => task.id == tid) != -1 ||
      user.rewarded_tasks.findIndex(task => task.id == tid) != -1
    ) {
      // cannot take if finished before
      return res.status(400).json({ error: 'Already finished' })
    }

    user.doing_tasks.push(task)
    await userRepository.save(user)
    return res.status(201).json({ msg: 'success' })
  }
)

router.post(
  '/submit',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const tid = req.body['id']
    const uid = (res.locals.user as User).id
    const taskRepo = getConnection().getRepository(Task)
    const userRepo = getConnection().getRepository(User)

    if ((await taskRepo.count({ id: tid })) == 0) {
      return res.status(404).json({ error: 'Task not existed' })
    }

    let task = await taskRepo.findOne(tid)
    let user = await userRepo.findOne(uid, {
      relations: [
        'doing_tasks',
        'failed_tasks',
        'rewarded_tasks',
        'moderating_tasks',
      ],
    })

    if (user.moderating_tasks.findIndex(task => task.id == tid) != -1) {
      return res.status(400).json({ error: 'Already under moderation' })
    }

    if (
      user.failed_tasks.findIndex(task => task.id == tid) != -1 ||
      user.rewarded_tasks.findIndex(task => task.id == tid) != -1
    ) {
      return res.status(400).json({ error: 'Already finished' })
    }

    const idx = user.doing_tasks.findIndex(task => task.id == tid)
    if (idx != -1) {
      const tasks = user.doing_tasks.splice(idx, 1)
      user.moderating_tasks.push(tasks[0])
      await userRepo.save(user)
      return res.status(201).json({ msg: 'success' })
    }
    return res.status(400).json({ error: 'Bad request' })
  }
)

router.post(
  '/moderate',
  [checkJWT, urlencoded({ extended: true })],
  async (req, res) => {
    const tid = req.body['taskId']
    const passed = req.body['passed']
    const takerId = req.body['takerId']
    const taskRepo = getConnection().getRepository(Task)
    const userRepo = getConnection().getRepository(User)

    console.log(req.body)
    if ((await taskRepo.count({ id: tid })) == 0) {
      return res.status(404).json({ error: 'Task not existed' })
    }

    let task = await taskRepo.findOne(tid)
    let taker = await userRepo.findOne(takerId, {
      relations: [
        'doing_tasks',
        'failed_tasks',
        'rewarded_tasks',
        'moderating_tasks',
      ],
    })

    if (taker.doing_tasks.findIndex(task => task.id == tid) != -1) {
      return res.status(400).json({ error: 'Please submit firsrt' })
    }

    if (taker.failed_tasks.findIndex(task => task.id == tid) != -1) {
      return res.status(400).json({ error: 'Already finished' })
    }

    const idx = taker.moderating_tasks.findIndex(task => task.id == tid)
    if (idx != -1) {
      const tasks = taker.moderating_tasks.splice(idx, 1)
      if (passed == 'true') {
        // moderation passed
        taker.rewarded_tasks.push(tasks[0])
      } else {
        // moderation failed
        taker.failed_tasks.push(tasks[0])
      }
      await userRepo.save(taker)
      return res.status(201).json({ msg: 'success' })
    }
    return res.status(400).json({ error: 'Bad request' })
  }
)

router.post(
  '/delete/all',
  [urlencoded({ extended: true })],
  async (req, res) => {
    await getConnection().getRepository(Task).clear()
    return res.status(201).json({ msg: 'success' })
  }
)

export default router
