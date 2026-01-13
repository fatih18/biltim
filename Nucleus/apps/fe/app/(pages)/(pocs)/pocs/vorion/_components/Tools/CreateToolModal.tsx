'use client'

import { useCallback, useState } from 'react'
import { LuCode, LuLoader, LuSparkles, LuTerminal, LuX } from 'react-icons/lu'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

export interface CreateToolData {
  name: string
  description: string
  language: 'python' | 'javascript' | 'typescript' | 'go'
  code: string
  tool_type: string
  is_public: boolean
  is_shared: boolean
  auto_version: boolean
}

interface CreateToolModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateToolData) => void
  isLoading?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const LANGUAGES = [
  { value: 'python', label: 'Python', color: 'text-yellow-600' },
  { value: 'javascript', label: 'JavaScript', color: 'text-yellow-400' },
  { value: 'typescript', label: 'TypeScript', color: 'text-blue-500' },
  { value: 'go', label: 'Go', color: 'text-cyan-500' },
] as const

const TOOL_TYPES = ['function', 'api', 'script', 'workflow'] as const

const CODE_TEMPLATES: Record<string, string> = {
  python: `def main(input_data: dict) -> dict:
    """
    Main function for the tool.
    
    Args:
        input_data: Input parameters
        
    Returns:
        Output result
    """
    # Your code here
    return {"result": "success"}
`,
  javascript: `/**
 * Main function for the tool.
 * @param {Object} inputData - Input parameters
 * @returns {Object} Output result
 */
function main(inputData) {
  // Your code here
  return { result: "success" };
}

module.exports = { main };
`,
  typescript: `interface InputData {
  // Define your input schema
}

interface OutputData {
  result: string;
}

export function main(inputData: InputData): OutputData {
  // Your code here
  return { result: "success" };
}
`,
  go: `package main

import "encoding/json"

type Input struct {
	// Define your input schema
}

type Output struct {
	Result string \`json:"result"\`
}

func Main(input Input) Output {
	// Your code here
	return Output{Result: "success"}
}
`,
}

// ============================================================================
// Component
// ============================================================================

export function CreateToolModal({ isOpen, onClose, onSubmit, isLoading }: CreateToolModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState<CreateToolData['language']>('python')
  const [code, setCode] = useState<string>(CODE_TEMPLATES.python ?? '')
  const [toolType, setToolType] = useState('function')
  const [isPublic, setIsPublic] = useState(false)
  const [isShared, setIsShared] = useState(false)
  const [autoVersion, setAutoVersion] = useState(true)

  const handleLanguageChange = useCallback((lang: CreateToolData['language']) => {
    setLanguage(lang)
    setCode(CODE_TEMPLATES[lang] || '')
  }, [])

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      language,
      code,
      tool_type: toolType,
      is_public: isPublic,
      is_shared: isShared,
      auto_version: autoVersion,
    })
  }, [name, description, language, code, toolType, isPublic, isShared, autoVersion, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey && !isLoading && name.trim()) {
        handleSubmit()
      }
    },
    [handleSubmit, isLoading, name]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-tool-title"
        className={cn(
          'relative w-full max-w-3xl max-h-[90vh] overflow-auto',
          'bg-white dark:bg-zinc-900 rounded-2xl',
          'border border-zinc-200 dark:border-white/10',
          'shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#c68e76]/20 to-violet-500/20">
              <LuTerminal size={20} className="text-[#c68e76]" />
            </div>
            <div>
              <h2
                id="create-tool-title"
                className="text-lg font-semibold text-zinc-900 dark:text-white"
              >
                Create Tool
              </h2>
              <p className="text-sm text-zinc-500">Define a new custom function</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <LuX size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Name & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my_tool"
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl',
                  'bg-zinc-50 dark:bg-white/5',
                  'border border-zinc-200 dark:border-white/10',
                  'text-zinc-900 dark:text-white',
                  'placeholder:text-zinc-400',
                  'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                )}
              />
            </div>
            <div>
              <label
                htmlFor="toolType"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Tool Type
              </label>
              <select
                value={toolType}
                onChange={(e) => setToolType(e.target.value)}
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl',
                  'bg-zinc-50 dark:bg-white/5',
                  'border border-zinc-200 dark:border-white/10',
                  'text-zinc-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                )}
              >
                {TOOL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this tool do?"
              rows={2}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl resize-none',
                'bg-zinc-50 dark:bg-white/5',
                'border border-zinc-200 dark:border-white/10',
                'text-zinc-900 dark:text-white',
                'placeholder:text-zinc-400',
                'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
              )}
            />
          </div>

          {/* Language Selection */}
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Language
            </label>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => handleLanguageChange(lang.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl',
                    'border transition-all',
                    language === lang.value
                      ? 'border-[#c68e76] bg-[#c68e76]/10 text-[#c68e76]'
                      : 'border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                  )}
                >
                  <LuCode
                    size={14}
                    className={language === lang.value ? 'text-[#c68e76]' : lang.color}
                  />
                  <span className="text-sm font-medium">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Editor */}
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Code
            </label>
            <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-white/5 border-b border-zinc-200 dark:border-white/10">
                <span className="text-xs text-zinc-500">{language}</span>
                <LuSparkles size={14} className="text-zinc-400" />
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                spellCheck={false}
                className={cn(
                  'w-full px-4 py-3 font-mono text-sm',
                  'bg-zinc-50 dark:bg-zinc-950',
                  'text-zinc-900 dark:text-zinc-100',
                  'focus:outline-none resize-none'
                )}
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoVersion}
                onChange={(e) => setAutoVersion(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-[#c68e76] focus:ring-[#c68e76]"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Auto-version on save</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-[#c68e76] focus:ring-[#c68e76]"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Share with team</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-[#c68e76] focus:ring-[#c68e76]"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Make public</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium',
              'text-zinc-600 dark:text-zinc-400',
              'hover:bg-zinc-100 dark:hover:bg-white/5',
              'transition-colors'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !name.trim()}
            className={cn(
              'flex items-center gap-2 px-6 py-2 rounded-xl',
              'bg-gradient-to-r from-[#c68e76] to-[#b07d67]',
              'hover:from-[#b07d67] hover:to-[#9a6c58]',
              'text-white font-medium text-sm',
              'transition-all',
              (isLoading || !name.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? <LuLoader size={16} className="animate-spin" /> : <LuTerminal size={16} />}
            Create Tool
          </button>
        </div>
      </div>
    </div>
  )
}
