import { Router } from 'express'
import userRoute from './user_api'
import profileRoute from './profile'
import taskRoute from './task_api'
import chatRoute from './chat'

const router = Router()
router.use('/users', userRoute)
router.use('/profile', profileRoute)
router.use('/tasks', taskRoute)
router.use('/chat', chatRoute)

export default router
