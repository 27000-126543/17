import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import waterRoutes from './routes/water.js'
import meteringRoutes from './routes/metering.js'
import drainageRoutes from './routes/drainage.js'
import sewageRoutes from './routes/sewage.js'
import inspectionRoutes from './routes/inspection.js'
import { generateWaterQualityData, checkWaterQualityAlarms, updatePressurePoints, calculatePumpCombination, togglePump, checkDrainageLevel, checkSewageStages, checkWorkOrderEscalation, checkBillingAndReminders } from './services.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/water', waterRoutes)
app.use('/api/metering', meteringRoutes)
app.use('/api/drainage', drainageRoutes)
app.use('/api/sewage', sewageRoutes)
app.use('/api/inspection', inspectionRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

let tickCount = 0
setInterval(() => {
  tickCount++
  try {
    const qData = generateWaterQualityData()
    checkWaterQualityAlarms(qData)
    const pp = updatePressurePoints()
    Array.from(new Set(pp.map(p => p.plantId))).forEach(plantId => {
      const { toStart, toStop } = calculatePumpCombination(plantId)
      toStart.forEach(id => togglePump(id, true))
      toStop.forEach(id => togglePump(id, false))
    })
    if (tickCount % 2 === 0) {
      checkDrainageLevel()
    }
    if (tickCount % 5 === 0) {
      checkSewageStages()
      checkWorkOrderEscalation()
      checkBillingAndReminders()
    }
    if (tickCount % 60 === 0) {
      console.log(`[${new Date().toLocaleTimeString('zh-CN')}] 定时巡检完成: ${tickCount}次`)
    }
  } catch (e) {
    console.error('定时任务错误:', e)
  }
}, 15000)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', error)
  res.status(500).json({
    success: false,
    error: 'Server internal error: ' + error.message,
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found: ' + req.url,
  })
})

export default app
