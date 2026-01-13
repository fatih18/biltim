/** biome-ignore-all lint/style/noNonNullAssertion: <> */
import { type Configuration, LogLevel } from '@azure/msal-browser'

// MSAL Config
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID! || 'e4cda89d-c868-4f73-994e-c1f4f5ba3fe4', // Application (client) ID
    authority: `https://login.microsoftonline.com/9f14330e-ba61-4345-b5f4-63a1df918fde`, // Directory (tenant) ID
    redirectUri:
      process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || 'http://localhost:3000/pocs/telekom/1',
    postLogoutRedirectUri:
      process.env.NEXT_PUBLIC_AZURE_LOGOUT_URI || 'http://localhost:3000/pocs/telekom/1',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        switch (level) {
          case LogLevel.Error:
            console.error(message)
            return
          case LogLevel.Info:
            console.info(message)
            return
          case LogLevel.Verbose:
            console.debug(message)
            return
          case LogLevel.Warning:
            console.warn(message)
            return
        }
      },
    },
  },
}

// Login sırasında alınacak izinler (scopes)
export const loginRequest = {
  scopes: ['User.Read', 'Mail.Read'], // User profile + Mail access
}

// Microsoft Graph endpoint’leri
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me', // profil bilgisi
  graphMailEndpoint: 'https://graph.microsoft.com/v1.0/me/messages', // mail kutusu
}
