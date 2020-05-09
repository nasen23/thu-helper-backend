import { Router } from 'express'
import userRoute from './user_api'
import profileRoute from './profile'

const router = Router()
router.use('/users', userRoute)
router.use('/profile', profileRoute)

export default router
