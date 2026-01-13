export type TodoItem = {
  id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: number
  tags: string[]
}

export type TodoFilter = 'all' | 'active' | 'completed'

export type TodoStats = {
  total: number
  completed: number
  active: number
}

export type StoreProps = {
  // Simple values - direct assignment testi
  filter: TodoFilter
  searchQuery: string

  // Nested object - nested reactivity testi
  settings: {
    theme: 'light' | 'dark'
    showCompleted: boolean
    sortBy: 'date' | 'priority' | 'name'
  }

  // Array - array reactivity testi
  todos: TodoItem[]

  // Complex nested - deep reactivity testi
  metadata: {
    lastModified: number
    version: string
    user: {
      name: string
      preferences: {
        notifications: boolean
      }
    }
  }
}

export type StoreMethods = {
  // Todo CRUD operations
  addTodo: (text: string, priority?: TodoItem['priority']) => void
  removeTodo: (id: string) => void
  toggleTodo: (id: string) => void
  updateTodo: (id: string, updates: Partial<TodoItem>) => void
  clearCompleted: () => void

  // Bulk operations
  toggleAll: () => void

  // Computed-like methods
  getStats: () => TodoStats
  getFilteredTodos: () => TodoItem[]
}
