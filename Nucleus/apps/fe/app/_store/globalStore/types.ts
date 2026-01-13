// Claims enum for authorization

import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'

export type StoreProps = {
  user: UserJSON | undefined
  isLoginChecked: boolean
}

export type StoreMethods = {
  test: () => string
}
