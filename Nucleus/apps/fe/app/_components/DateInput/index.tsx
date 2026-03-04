import React, { useRef } from 'react'

type DateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value: string
  onChange: (value: string) => void
}

export function DateInput({ value, onChange, className = '', ...rest }: DateInputProps) {
  const ref = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const el = ref.current
    if (!el) return
    ;(el as any).showPicker?.()
    el.focus()
  }

  return (
    <div onClick={openPicker} className="cursor-pointer">
      <input
        {...rest}
        ref={ref}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    </div>
  )
}