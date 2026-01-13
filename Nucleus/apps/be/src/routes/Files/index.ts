import { ReadFile } from '@/controllers'
import type { App } from '@/server'

export function FilesRoute(app: App) {
  return app.group('/files', (app) => {
    return app.get('/:id', ReadFile)
  })
}
