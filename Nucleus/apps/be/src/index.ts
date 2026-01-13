import cluster from 'node:cluster'
import os from 'node:os'
import process from 'node:process'

if (process.env.SERVE_CLUSTERED === 'true') {
  try {
    if (cluster.isPrimary) {
      for (let i = 0; i < os.availableParallelism(); i++) cluster.fork()
    } else {
      await import('./server')
      console.log('✅ Server imported successfully')
      console.log(`🚀 Server should be listening on port ${process.env.PORT || 'UNKNOWN'}`)
      console.log('💚 Health check endpoint: GET /health')
      console.log(`\n\n 🖥️ Nucleus API: 👷 Worker ${process.pid} started\n\n`)
    }
  } catch (error) {
    console.error('❌ Failed to import server:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
} else {
  try {
    await import('./server')
    console.log('✅ Server imported successfully')
    console.log(`🚀 Server should be listening on port ${process.env.PORT || 'UNKNOWN'}`)
    console.log('💚 Health check endpoint: GET /health')
  } catch (error) {
    console.error('❌ Failed to import server:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}
