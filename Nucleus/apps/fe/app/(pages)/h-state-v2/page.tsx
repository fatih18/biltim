'use client'

import { Check, ChevronDown, Plus, Search, Settings, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTodoStore } from '@/app/_store'

export default function HStateV2() {
  const store = useTodoStore()
  const [newTodoText, setNewTodoText] = useState('')
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [showSettings, setShowSettings] = useState(false)

  const stats = store.getStats()
  const filteredTodos = store.getFilteredTodos()

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      store.addTodo(newTodoText.trim(), newTodoPriority)
      setNewTodoText('')
      setNewTodoPriority('medium')
    }
  }

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            H-State V2 Demo
          </h1>
          <p className="text-gray-600">Signal-based reactive store with fine-grained reactivity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border-2 border-purple-200 p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Total Tasks</div>
            <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border-2 border-green-200 p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Completed</div>
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Active</div>
            <div className="text-3xl font-bold text-blue-600">{stats.active}</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Todo List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Add Todo */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Add New Task</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                  placeholder="What needs to be done?"
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
                />
                <select
                  value={newTodoPriority}
                  onChange={(e) => setNewTodoPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddTodo}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={store.searchQuery}
                    onChange={(e) => {
                      // Direct assignment - simple value reactivity
                      store.searchQuery = e.target.value
                    }}
                    placeholder="Search tasks..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-purple-400 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                {(['all', 'active', 'completed'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      // Direct assignment - enum value reactivity
                      store.filter = filter
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      store.filter === filter
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-white rounded-xl border-2 border-purple-200 p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Settings - Nested Object Reactivity</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Theme</span>
                    <select
                      value={store.settings.theme}
                      onChange={(e) => {
                        // Nested object property update
                        store.settings.theme = e.target.value as 'light' | 'dark'
                      }}
                      className="px-3 py-1 border-2 border-gray-200 rounded-lg text-sm"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show Completed</span>
                    <button
                      type="button"
                      onClick={() => {
                        // Nested boolean toggle
                        store.settings.showCompleted = !store.settings.showCompleted
                      }}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        store.settings.showCompleted ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          store.settings.showCompleted ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sort By</span>
                    <select
                      value={store.settings.sortBy}
                      onChange={(e) => {
                        // Nested enum update
                        store.settings.sortBy = e.target.value as 'date' | 'priority' | 'name'
                      }}
                      className="px-3 py-1 border-2 border-gray-200 rounded-lg text-sm"
                    >
                      <option value="date">Date</option>
                      <option value="priority">Priority</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Deep nested access: {store.metadata.user.name} - Notifications:{' '}
                      {store.metadata.user.preferences.notifications ? 'On' : 'Off'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Todo List */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Tasks ({filteredTodos.length})</h2>
                {stats.completed > 0 && (
                  <button
                    type="button"
                    onClick={() => store.clearCompleted()}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear completed
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {filteredTodos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    {store.searchQuery ? 'No tasks found' : 'No tasks yet'}
                  </div>
                ) : (
                  filteredTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`group flex items-start gap-3 p-4 border-2 rounded-lg transition-all ${
                        todo.completed
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => store.toggleTodo(todo.id)}
                        className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          todo.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {todo.completed && <Check className="w-3 h-3 text-white" />}
                      </button>

                      <div className="flex-1">
                        <div
                          className={`font-medium ${
                            todo.completed ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {todo.text}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded border ${priorityColors[todo.priority]}`}
                          >
                            {todo.priority}
                          </span>
                          {todo.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => store.removeTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {stats.total > 0 && (
                <button
                  type="button"
                  onClick={() => store.toggleAll()}
                  className="mt-4 w-full py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  {stats.completed === stats.total ? 'Mark all as active' : 'Mark all as completed'}
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Store Inspector */}
          <div className="space-y-4">
            {/* Store Methods Demo */}
            <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-sm">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ChevronDown className="w-4 h-4" />
                Store Methods
              </h3>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-mono text-xs text-blue-900">store.addTodo()</div>
                  <div className="text-xs text-blue-600 mt-1">Custom method</div>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-mono text-xs text-blue-900">store.filter = 'all'</div>
                  <div className="text-xs text-blue-600 mt-1">Direct assignment</div>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-mono text-xs text-blue-900">store.settings.theme</div>
                  <div className="text-xs text-blue-600 mt-1">Nested access</div>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-mono text-xs text-blue-900">store.todos = [...]</div>
                  <div className="text-xs text-blue-600 mt-1">Array reactivity</div>
                </div>
              </div>
            </div>

            {/* Special Methods Demo */}
            <div className="bg-white rounded-xl border-2 border-green-200 p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Special Methods</h3>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    // Direct read - pure TypeScript!
                    const currentSettings = store.settings
                    alert(`Theme: ${currentSettings.theme}\nSort: ${currentSettings.sortBy}`)
                  }}
                  className="w-full px-3 py-2 text-sm bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 transition-colors"
                >
                  Direct Read
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Direct assignment - otomatik reactive!
                    store.settings = {
                      theme: 'dark',
                      showCompleted: true,
                      sortBy: 'priority',
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-orange-50 text-orange-700 rounded border border-orange-200 hover:bg-orange-100 transition-colors"
                >
                  Direct Write
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // $merge helper - merges and updates
                    store.$merge({
                      metadata: {
                        ...store.metadata,
                        user: {
                          ...store.metadata.user,
                          name: 'Updated User',
                          preferences: {
                            notifications: !store.metadata.user.preferences.notifications,
                          },
                        },
                      },
                    })
                  }}
                  className="w-full px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  $merge() Helper
                </button>
              </div>
            </div>

            {/* Metadata Display */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Store Metadata</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Version:</span>
                  <span className="font-mono">{store.metadata.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">User:</span>
                  <span className="font-mono">{store.metadata.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Modified:</span>
                  <span className="font-mono">
                    {new Date(store.metadata.lastModified).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Notifications:</span>
                  <span className="font-mono">
                    {store.metadata.user.preferences.notifications ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reactivity Info */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-6 shadow-sm">
              <h3 className="font-semibold mb-2 text-purple-900">✨ Signal-Based Reactivity</h3>
              <ul className="text-xs space-y-1 text-purple-800">
                <li>• Fine-grained updates</li>
                <li>• Nested object tracking</li>
                <li>• Array item reactivity</li>
                <li>• Deep path notifications</li>
                <li>• TypeScript intellisense</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
