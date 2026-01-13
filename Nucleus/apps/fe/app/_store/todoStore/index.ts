'use client'

import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { StoreMethods, StoreProps, TodoItem } from './types'

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {
  addTodo: (store) => {
    return (text: string, priority: TodoItem['priority'] = 'medium') => {
      const newTodo: TodoItem = {
        id: Date.now().toString(),
        text,
        completed: false,
        priority,
        createdAt: Date.now(),
        tags: [],
      }

      // Direct assignment - otomatik reactive (getter/setter)!
      store.todos = [...store.todos, newTodo]
      store.metadata.lastModified = Date.now()
    }
  },

  removeTodo: (store) => {
    return (id: string) => {
      store.todos = store.todos.filter((todo: TodoItem) => todo.id !== id)
      store.metadata.lastModified = Date.now()
    }
  },

  toggleTodo: (store) => {
    return (id: string) => {
      store.todos = store.todos.map((todo: TodoItem) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
      store.metadata.lastModified = Date.now()
    }
  },

  updateTodo: (store) => {
    return (id: string, updates: Partial<TodoItem>) => {
      store.todos = store.todos.map((todo: TodoItem) =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
      store.metadata.lastModified = Date.now()
    }
  },

  clearCompleted: (store) => {
    return () => {
      store.todos = store.todos.filter((todo: TodoItem) => !todo.completed)
      store.metadata.lastModified = Date.now()
    }
  },

  toggleAll: (store) => {
    return () => {
      const allCompleted = store.todos.every((todo: TodoItem) => todo.completed)
      store.todos = store.todos.map((todo: TodoItem) => ({
        ...todo,
        completed: !allCompleted,
      }))
      store.metadata.lastModified = Date.now()
    }
  },

  getStats: (store) => {
    return () => {
      const total = store.todos.length
      const completed = store.todos.filter((todo) => todo.completed).length
      const active = total - completed
      return { total, completed, active }
    }
  },

  getFilteredTodos: (store) => {
    return () => {
      let filtered = store.todos

      // Filter by completion status
      if (store.filter === 'active') {
        filtered = filtered.filter((todo) => !todo.completed)
      } else if (store.filter === 'completed') {
        filtered = filtered.filter((todo) => todo.completed)
      }

      // Filter by search query
      if (store.searchQuery) {
        filtered = filtered.filter((todo) =>
          todo.text.toLowerCase().includes(store.searchQuery.toLowerCase())
        )
      }

      // Sort
      filtered = [...filtered].sort((a, b) => {
        if (store.settings.sortBy === 'date') {
          return b.createdAt - a.createdAt
        }
        if (store.settings.sortBy === 'priority') {
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        }
        // name
        return a.text.localeCompare(b.text)
      })

      return filtered
    }
  },
}

const initialStore: StoreProps = {
  filter: 'all',
  searchQuery: '',
  settings: {
    theme: 'light',
    showCompleted: true,
    sortBy: 'date',
  },
  todos: [
    {
      id: '1',
      text: 'Learn h-state signals',
      completed: true,
      priority: 'high',
      createdAt: Date.now() - 3600000,
      tags: ['learning'],
    },
    {
      id: '2',
      text: 'Build awesome app',
      completed: false,
      priority: 'medium',
      createdAt: Date.now() - 1800000,
      tags: ['development'],
    },
    {
      id: '3',
      text: 'Test reactivity',
      completed: false,
      priority: 'high',
      createdAt: Date.now() - 900000,
      tags: ['testing', 'important'],
    },
  ],
  metadata: {
    lastModified: Date.now(),
    version: '1.0.0',
    user: {
      name: 'Demo User',
      preferences: {
        notifications: true,
      },
    },
  },
}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore as useTodoStore }
