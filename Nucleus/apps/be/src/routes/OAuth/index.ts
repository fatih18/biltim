import {
  AzureCallback,
  GetAzureAuthUrl,
  GetAzureDriveFileDownloadUrl,
  GetAzureDriveFiles,
  GetAzureMailMessages,
  GetGitHubAuthUrl,
  GetMyOAuthAccounts,
  GitHubCallback,
  SendAzureMail,
  UnlinkAzure,
  UnlinkGitHub,
} from '@/controllers/OAuth'
import type { App } from '@/server'

export function OAuthRoutes(app: App) {
  return app.group('/oauth', (routes) => {
    return routes
      .get('/me/accounts', GetMyOAuthAccounts) // Get authenticated user's OAuth accounts
      .group('/github', (github) => {
        return github
          .get('/auth-url', GetGitHubAuthUrl)
          .get('/callback', GitHubCallback)
          .delete('/unlink', UnlinkGitHub)
      })
      .group('/azure', (azure) => {
        return azure
          .get('/auth-url', GetAzureAuthUrl)
          .get('/callback', AzureCallback)
          .get('/drive/files', GetAzureDriveFiles)
          .get('/drive/items/:itemId/download-url', GetAzureDriveFileDownloadUrl)
          .get('/mail/messages', GetAzureMailMessages)
          .post('/mail/send', SendAzureMail)
          .delete('/unlink', UnlinkAzure)
      })
    // Add routes for other providers here as needed
    // .group("/google", (google) => { ... })
  })
}
