import { Router } from "express"
import { urlencoded } from "body-parser"
import { ReqNewTask } from "../types"
import { plainToClass } from "class-transformer"
import { validateOrReject } from "class-validator"
import { getConnection } from "typeorm"
import { Task } from "../entity/task"
import { checkJWT } from "./auth"
import { User } from "../entity/user"

const router = Router()

router.post('/add', [checkJWT, urlencoded({ extended: true })], async (req, res) => {
  console.log(req.body)
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
    if (result.duration && !result.end_time) {
      result.end_time = result.start_time + result.duration
    }
    console.log(result)
    return res.status(201).json({ id: result.id })
  } catch (err) {
    console.log(err)
  }
  console.log("000")
})

router.get('/all', [urlencoded({ extended: true })], async (req, res) => {
  let tasks: Task[] = await getConnection().getRepository(Task).find()
  for (let task of tasks) {
    console.log(task)
    console.log(typeof (task))
  }
  return res.status(200).json({ tasks })
})

router.post('/delete/all', [urlencoded({ extended: true })], async (req, res) => {
  await getConnection().getRepository(Task).clear()
  return res.status(201).json({ delete: 'success' })
})

export default router
