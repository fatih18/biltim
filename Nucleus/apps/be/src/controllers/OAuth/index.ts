/**
 * OAuth Controllers Index
 *
 * Exports all OAuth-related controllers for route registration
 */

// Azure OAuth
export { AzureCallback } from './Azure/Callback'
export { GetAzureAuthUrl } from './Azure/GetAuthUrl'
export { GetAzureDriveFileDownloadUrl } from './Azure/GetDriveFileDownloadUrl'
export { GetAzureDriveFiles } from './Azure/GetDriveFiles'
export { GetAzureMailMessages } from './Azure/GetMailMessages'
export { SendAzureMail } from './Azure/SendMail'
export { UnlinkAzure } from './Azure/Unlink'
// Common
export { GetMyOAuthAccounts } from './GetMyAccounts'
// GitHub OAuth
export { GitHubCallback } from './GitHub/Callback'
export { GetGitHubAuthUrl } from './GitHub/GetAuthUrl'
export { UnlinkGitHub } from './GitHub/Unlink'
