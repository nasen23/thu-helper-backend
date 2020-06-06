import { Router, response } from "express"
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

router.get('/all', [urlencoded({ extended: true })], async (req, res) => {
  const type: string = req.query['type']
  const repository = await getConnection().getRepository(Task)
  if (!type) {
    const tasks = await repository.find()
    return res.status(200).json({ tasks })
  } else if (['community', 'meal', 'study', 'questionnaire'].indexOf(type) != -1) {
    const tasks = await repository.find({ type: type })
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
