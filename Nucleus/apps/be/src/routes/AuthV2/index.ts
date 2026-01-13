import { GetMeV2, LoginV2, LogoutV2, RefreshV2, RegisterV2 } from '@/controllers'
import type { App } from '@/server'

export function AuthV2Routes(app: App) {
  return app.group('/v2/auth', (routes) => {
    return routes
      .post('/login', LoginV2)
      .post('/register', RegisterV2)
      .post('/refresh', RefreshV2)
      .post('/logout', LogoutV2)
      .get('/me', GetMeV2)
  })
}
