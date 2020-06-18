import { Router, response } from "express"
import { urlencoded } from "body-parser"
import { ReqNewTask } from "../types"
import { plainToClass } from "class-transformer"
import { validateOrReject } from "class-validator"
import { getConnection, Not } from "typeorm"
import { Task } from "../entity/task"
import { checkJWT } from "./auth"
import { User } from "../entity/user"
import { url } from "inspector"

const router = Router()

function hasEnded(task: Task): boolean {
  return task.end_time >= new Date().toString()
    || task.times_finished >= task.times_total
}

function mapUserToId(task: Task): void {
  task.doing_users = Object(task.doing_users.map(user => user.id))
  task.failed_users = Object(task.failed_users.map(user => user.id))
  task.rewarded_users = Object(task.rewarded_users.map(user =>  user.id))
  task.moderating_users = Object(task.moderating_users.map(user => user.id))
}

router.post('/add', [checkJWT, urlencoded({ extended: true })], async (req, res) => {
  const data = plainToClass(ReqNewTask, req.body)
  try {
    await validateOrReject(data)
  } catch (errors) {
    console.log(errors)
    return res.status(400).json({ error: 'Invalid request body' })
  }
  const users = getConnection().getRepository(User)
  const publisher = await users.findOne(res.locals.userid)

  data['publisher'] = publisher

  const tasks = getConnection().getRepository(Task)
  const task = tasks.create(data)
  try {
    let result = await tasks.save(task)
    return res.status(201).json({ id: result.id })
  } catch (err) {
    console.log(err)
  }
})

router.get('/get', [checkJWT, urlencoded({ extended: true })], async (req, res) => {
  const id = req.query['id']
  const tasks = getConnection().getRepository(Task)
  let task = await tasks.findOne(id, {
    relations: ['doing_users', 'moderating_users','failed_users', 'rewarded_users']
  })

  if (task) {
    return res.json({ task })
  } else {
    return res.status(404).json({ error: 'Task not found' })
  }
})

router.get('/all', [urlencoded({ extended: true })], async (req, res) => {
  const repository = await getConnection().getRepository(Task)
  let tasks = await repository.find({
    relations: ['doing_users','moderating_users', 'failed_users', 'rewarded_users']
  })
  tasks.forEach(task => {
    mapUserToId(task)
  })
  return res.status(200).json({ tasks })
})

router.get('/others', [checkJWT, urlencoded({ extended: true })], async (req, res) => {
  const uid = res.locals.userid
  const type: string = req.query['type']
  const taskRepo = getConnection().getRepository(Task)
  const userRepo = getConnection().getRepository(User)
  const query = taskRepo.createQueryBuilder('task')
    .leftJoinAndSelect("task.doing_users", "doing_users")
    .leftJoinAndSelect("task.failed_users", "failed_users")
    .leftJoinAndSelect("task.rewarded_users", "rewarded_users")
    .leftJoinAndSelect("task.moderating_users", "moderating_users")
    .where("(task.end_time) > (:now)", { now: Date.now().toString() })

  if (!type) {
    let tasks = await query.andWhere("task.publisherId != :uid", { uid: uid }).getMany()
    tasks.forEach(task => {
      mapUserToId(task)
    })
    return res.status(200).json({ tasks })
  } else if (['community', 'meal', 'study', 'questionnaire'].includes(type)) {
    let tasks = await query.andWhere("task.type = :type", { type: type }).getMany()
    tasks.forEach(task => {
      mapUserToId(task)
    })
    return res.status(200).json({ tasks })
  } else if (['doing', 'moderating', 'rewarded', 'failed'].includes(type)) {
    const user = await userRepo.findOne(uid, {
      relations: ["doing_tasks", "moderating_tasks", "failed_tasks", "rewarded_tasks"]
    })
    let tasks = []
    switch (type) {
      case 'doing':
        tasks = user.doing_tasks
        break;
      case 'moderating':
        tasks = user.moderating_tasks
        break;
      case 'rewarded':
        tasks = user.rewarded_tasks
        break;
      case 'failed':
        tasks = user.failed_tasks
        break;
    }
    return res.status(200).json({ tasks })
  } else {
    return res.status(400).json({ error: 'Invalid query parameters' })
  }
})

router.get('/mine', [checkJWT, urlencoded({ extended: true })], async(req, res) => {
  const uid = res.locals.userid
  const type = req.query['type']
  const userRepo = getConnection().getRepository(User)
  const user = await userRepo.findOne(uid, {
    relations: ['published_tasks']
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
})

router.post('/take', [checkJWT, urlencoded({ extended: true })], async (req, res) => {
  const uid = res.locals.userid
  const tid = req.body['id']
  const taskRepository = getConnection().getRepository(Task)
  const userRepository = getConnection().getRepository(User)

  if (await taskRepository.count({ id : tid }) == 0) {
    return res.status(404).json({ error: 'Task not exist' })
  }

  let task = await taskRepository.findOne(tid)
  let user = await userRepository.findOne(uid, {
    relations: ['doing_tasks', 'failed_tasks', 'rewarded_tasks', 'moderating_tasks']
  })
  if (user.doing_tasks.findIndex(task => task.id == tid) != -1 ||
    user.moderating_tasks.findIndex(task => task.id == tid) != -1) {
    // cannot take twice unless the previous one has finished
    return res.status(400).json({ error: 'Already taken' })
  }
  if (user.failed_tasks.findIndex(task => task.id == tid) != -1 ||
    user.rewarded_tasks.findIndex(task => task.id == tid) != -1) {
    // cannot take if finished before
    return res.status(400).json({ error: 'Already finished' })
  }

  user.doing_tasks.push(task)
  const result = await userRepository.save(user)
  return res.status(201).json({ msg: 'success' })
})

router.post('/delete/all', [urlencoded({ extended: true })], async (req, res) => {
  await getConnection().getRepository(Task).clear()
  return res.status(201).json({ msg: 'success' })
})

export default router
