import { Router } from 'express'
import userRoute from './user_api'
import profileRoute from './profile'
import taskRoute from './task_api'
import './chat'

const router = Router()
router.use('/users', userRoute)
router.use('/profile', profileRoute)
router.use('/tasks', taskRoute)

export default router
