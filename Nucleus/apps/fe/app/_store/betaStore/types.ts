// Claims enum for authorization

export type StoreProps = {
  lorem: string
  ipsum: number | null
  dolor: boolean | undefined
  sit: string[]
  amet: {
    foo: string
    bar: number
  }
}

export type StoreMethods = {
  test: () => string
}
