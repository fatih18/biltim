export type RemoteAgentContext = {
  query?: {
    agentId?: string
    apiKey?: string
  }
}

export type RemoteAgentSocket = {
  data?: {
    query?: {
      agentId?: string
      apiKey?: string
    }
  }
  send?: (message: string) => void
  close?: (code?: number, reason?: string) => void
} & Record<string, unknown>

const agents = new Map<string, RemoteAgentSocket>()

export function registerRemoteAgent(agentId: string, ws: RemoteAgentSocket): void {
  agents.set(agentId, ws)
}

export function unregisterRemoteAgent(agentId: string, ws?: RemoteAgentSocket): void {
  const current = agents.get(agentId)
  if (!current) return
  if (!ws || current === ws) {
    agents.delete(agentId)
  }
}

export function getRemoteAgentSocket(agentId: string): RemoteAgentSocket | undefined {
  return agents.get(agentId)
}

type PendingCommand = {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

const pendingCommands = new Map<string, PendingCommand>()

export function createPendingCommand(commandId: string, timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingCommands.delete(commandId)
      reject(new Error('Remote command timed out'))
    }, timeoutMs)
    pendingCommands.set(commandId, { resolve, reject, timeoutId })
  })
}

export function resolvePendingCommand(commandId: string, result: unknown): void {
  const pending = pendingCommands.get(commandId)
  if (!pending) return
  pendingCommands.delete(commandId)
  clearTimeout(pending.timeoutId)
  pending.resolve(result)
}

export function rejectPendingCommand(commandId: string, error: Error): void {
  const pending = pendingCommands.get(commandId)
  if (!pending) return
  pendingCommands.delete(commandId)
  clearTimeout(pending.timeoutId)
  pending.reject(error)
}
