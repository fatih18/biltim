'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ChevronDown } from 'lucide-react'
import type React from 'react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

interface SelectOption<T extends string | number> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface AnimatedSelectProps<T extends string | number> {
  options: SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  placeholder?: string
  className?: string
  id: string
  name?: string
  'aria-label'?: string
  label?: string
  isDark?: boolean
}

export function SelectBox<T extends string | number>({
  options,
  value,
  onChange,
  placeholder = 'Seçiniz...',
  className = '',
  id,
  name,
  'aria-label': ariaLabel,
  label,
  isDark = true,
}: AnimatedSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const listboxRef = useRef<HTMLDivElement>(null)
  const chevronRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  const selectedOption = options.find((opt) => opt.value === value)
  const selectedIndex = options.findIndex((opt) => opt.value === value)

  const buttonId = `${id}-button`
  const listboxId = `${id}-listbox`
  const labelId = label && !ariaLabel ? `${id}-label` : undefined
  const inputName = name ?? id
  const computedAriaLabel = ariaLabel ?? label ?? placeholder

  useGSAP(
    () => {
      if (!listboxRef.current || !chevronRef.current) return

      if (isOpen) {
        gsap.to(listboxRef.current, {
          height: 'auto',
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
        })

        gsap.to(chevronRef.current, {
          rotation: 180,
          duration: 0.3,
          ease: 'power2.inOut',
        })

        const children = listboxRef.current.children
        gsap.fromTo(
          children,
          {
            opacity: 0,
            y: -10,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.05,
            ease: 'power2.out',
          }
        )
      } else {
        gsap.to(listboxRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
        })

        gsap.to(chevronRef.current, {
          rotation: 0,
          duration: 0.3,
          ease: 'power2.inOut',
        })
      }
    },
    { dependencies: [isOpen], scope: containerRef }
  )

  const handleSelect = (optionValue: T) => {
    onChange(optionValue)
    setIsOpen(false)
    setFocusedIndex(-1)
    buttonRef.current?.focus()
  }

  const onClickOutside = useEffectEvent((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false)
      setFocusedIndex(-1)
    }
  })

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      onClickOutside(event)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        setIsOpen(!isOpen)
        break
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        break
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0)
        } else {
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev))
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        }
        break
      case 'Home':
        if (isOpen) {
          event.preventDefault()
          setFocusedIndex(0)
        }
        break
      case 'End':
        if (isOpen) {
          event.preventDefault()
          setFocusedIndex(options.length - 1)
        }
        break
    }
  }

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, optionValue: T) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect(optionValue)
    }
  }

  useEffect(() => {
    if (focusedIndex >= 0 && isOpen) {
      const listItems = listboxRef.current?.children
      if (listItems?.[focusedIndex]) {
        ;(listItems[focusedIndex] as HTMLElement).focus()
      }
    }
  }, [focusedIndex, isOpen])

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label ? (
        <label
          id={labelId}
          htmlFor={buttonId}
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          {label}
        </label>
      ) : null}
      <input type="hidden" value={String(value)} name={inputName} />
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : computedAriaLabel}
        className={`
          w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base
          rounded-lg sm:rounded-xl
          border transition-all duration-300 
          flex items-center justify-between 
          shadow-lg
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${
            isDark
              ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-700 hover:border-blue-500 hover:shadow-blue-500/20 focus:ring-blue-500 focus:ring-offset-slate-950'
              : 'bg-white text-slate-900 border-slate-300 hover:border-blue-500 hover:shadow-blue-500/10 focus:ring-blue-500 focus:ring-offset-white'
          }
        `}
      >
        <span className="flex items-center gap-2 sm:gap-3 min-w-0">
          {selectedOption?.icon && (
            <span className="flex-shrink-0 text-lg sm:text-xl">{selectedOption.icon}</span>
          )}
          <span className="font-medium truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          ref={chevronRef}
          className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ml-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          aria-hidden="true"
        />
      </button>

      <div
        ref={listboxRef}
        id={listboxId}
        role="listbox"
        aria-labelledby={labelId}
        aria-activedescendant={
          isOpen && focusedIndex >= 0 ? `${id}-option-${focusedIndex}` : undefined
        }
        tabIndex={-1}
        className={`
          absolute w-full mt-2 
          rounded-lg sm:rounded-xl
          border shadow-2xl overflow-hidden z-50 
          ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}
        `}
        style={{ height: 0, opacity: 0 }}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={option.value === value}
            tabIndex={isOpen ? 0 : -1}
            onClick={() => handleSelect(option.value)}
            onKeyDown={(e) => handleOptionKeyDown(e, option.value)}
            className={`
              w-full px-3 py-2.5 sm:px-4 sm:py-3
              text-sm sm:text-base
              flex items-center gap-2 sm:gap-3
              transition-all duration-200 cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-inset
              ${
                option.value === value
                  ? isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDark
                    ? 'text-slate-300 hover:bg-slate-700 focus:ring-blue-400'
                    : 'text-slate-700 hover:bg-slate-100 focus:ring-blue-500'
              }
            `}
          >
            {option.icon && (
              <span aria-hidden="true" className="flex-shrink-0 text-lg sm:text-xl">
                {option.icon}
              </span>
            )}
            <span className="font-medium truncate">{option.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
