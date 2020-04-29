import { Router } from 'express'
import userRoute from './user_api'

const router = Router()
router.use('/users', userRoute)

export default router
