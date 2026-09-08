export type ConfirmTone = 'default' | 'danger'

export type ConfirmOptions = {
  title: string
  /** Main body text. Keep it to one or two sentences. */
  message?: string
  /**
   * Items the action applies to. Rendered as a list rather than glued into
   * `message` with "\n", which a native confirm() forced and a styled dialog
   * should not.
   */
  items?: string[]
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

export type ConfirmRequest = ConfirmOptions & {
  id: number
  resolve: (value: boolean) => void
}
