import { Router, response } from "express"
import { urlencoded } from "body-parser"
import { ReqNewTask } from "../types"
import { plainToClass } from "class-transformer"
import { validateOrReject } from "class-validator"
import { getConnection, Not } from "typeorm"
import { Task } from "../entity/task"
import { checkJWT } from "./auth"
import { User } from "../entity/user"

const router = Router()

function has_ended(task: Task): boolean {
  const end_time = +task.end_time
  const now = Date.parse(new Date().toString())
  return now >= end_time
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
  data['is_proceeding'] = true
  data['is_done'] = false
  data['is_paid'] = false

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
  const task = await tasks.findOne(id)

  if (task) {
    console.log(task)
    return res.json({ task })
  } else {
    return res.status(404).json({ error: 'Task not found' })
  }
})

router.get('/all', [urlencoded({ extended: true })], async (req, res) => {
  const repository = await getConnection().getRepository(Task)
  const tasks = await repository.find()
  return res.status(200).json({ tasks })
})

router.get('/others/:uid', [checkJWT, urlencoded({ extended: true })], async (req, res) => {
  const uid = req.params['uid']
  const cnt = await getConnection().getRepository(User).count({ id: uid })
  if (cnt == 0) {
    return res.status(404).json({ error: 'User id not exist' })
  }

  const type: string = req.query['type']
  const repository = getConnection().getRepository(Task)
  const query = repository.createQueryBuilder('task')
    .where("(task.end_time) > (:now)", { now: Date.now().toString() })

  if (!type) {
    const tasks = await query.andWhere("task.publisherId != :uid", { uid: uid }).getMany()
    return res.status(200).json({ tasks })
  } else if (['community', 'meal', 'study', 'questionnaire'].indexOf(type) != -1) {
    const tasks = await query.andWhere("task.type = :type", { type: type }).getMany()
    return res.status(200).json({ tasks })
  } else {
    return res.status(400).json({ error: 'Invalid query parameters' })
  }
})

router.post('/delete/all', [urlencoded({ extended: true })], async (req, res) => {
  await getConnection().getRepository(Task).clear()
  return res.status(201).json({ delete: 'success' })
})

export default router
