import {
  CreateRemoteComputer,
  ExecuteRemoteCommand,
  RegisterRemoteComputer,
  RemoteHeartbeat,
} from '@/controllers'
import type { App } from '@/server'

export function RemoteRoutes(app: App) {
  return app.group('/api/remote/computers', (routes) => {
    return routes
      .post('/create', CreateRemoteComputer) // FE calls this to get API key
      .post('/register', RegisterRemoteComputer) // Agent calls this with API key
      .post('/heartbeat', RemoteHeartbeat)
      .post('/:agentId/commands/execute', ExecuteRemoteCommand)
  })
}
