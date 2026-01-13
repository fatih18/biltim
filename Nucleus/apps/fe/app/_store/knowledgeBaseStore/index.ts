'use client'

import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { StoreMethods, StoreProps } from './types'

// ============================================================================
// Initial State
// ============================================================================

const initialStore: StoreProps = {
  knowledgeBases: [],
  selectedKnowledgeBase: null,
  isLoadingKnowledgeBases: false,

  documentsByKnowledgeBase: {},
  isLoadingDocuments: false,

  isCreateModalOpen: false,
  isUploadModalOpen: false,
  searchQuery: '',
}

// ============================================================================
// Store Methods
// ============================================================================

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {
  // Knowledge Base management
  setKnowledgeBases: (store) => (kbs) => {
    store.knowledgeBases = kbs
  },

  addKnowledgeBase: (store) => (kb) => {
    store.knowledgeBases = [kb, ...store.knowledgeBases]
  },

  updateKnowledgeBase: (store) => (kb) => {
    store.knowledgeBases = store.knowledgeBases.map((k) => (k.id === kb.id ? kb : k))
    if (store.selectedKnowledgeBase?.id === kb.id) {
      store.selectedKnowledgeBase = kb
    }
  },

  removeKnowledgeBase: (store) => (kbId) => {
    store.knowledgeBases = store.knowledgeBases.filter((k) => k.id !== kbId)
    if (store.selectedKnowledgeBase?.id === kbId) {
      store.selectedKnowledgeBase = null
    }
    // Clean up documents
    const { [kbId]: _, ...rest } = store.documentsByKnowledgeBase
    store.documentsByKnowledgeBase = rest
  },

  selectKnowledgeBase: (store) => (kb) => {
    store.selectedKnowledgeBase = kb
  },

  // Document management
  setDocumentsForKnowledgeBase: (store) => (kbId, docs) => {
    store.documentsByKnowledgeBase = {
      ...store.documentsByKnowledgeBase,
      [kbId]: docs,
    }
  },

  addDocument: (store) => (kbId, doc) => {
    const existing = store.documentsByKnowledgeBase[kbId] || []
    store.documentsByKnowledgeBase = {
      ...store.documentsByKnowledgeBase,
      [kbId]: [doc, ...existing],
    }
  },

  updateDocument: (store) => (kbId, doc) => {
    const existing = store.documentsByKnowledgeBase[kbId] || []
    store.documentsByKnowledgeBase = {
      ...store.documentsByKnowledgeBase,
      [kbId]: existing.map((d) => (d.id === doc.id ? doc : d)),
    }
  },

  removeDocument: (store) => (kbId, docId) => {
    const existing = store.documentsByKnowledgeBase[kbId] || []
    store.documentsByKnowledgeBase = {
      ...store.documentsByKnowledgeBase,
      [kbId]: existing.filter((d) => d.id !== docId),
    }
  },

  // UI
  setCreateModalOpen: (store) => (open) => {
    store.isCreateModalOpen = open
  },

  setUploadModalOpen: (store) => (open) => {
    store.isUploadModalOpen = open
  },

  setSearchQuery: (store) => (query) => {
    store.searchQuery = query
  },

  setIsLoadingKnowledgeBases: (store) => (loading) => {
    store.isLoadingKnowledgeBases = loading
  },

  setIsLoadingDocuments: (store) => (loading) => {
    store.isLoadingDocuments = loading
  },

  // Helpers
  getDocumentsForKnowledgeBase: (store) => (kbId) => {
    return store.documentsByKnowledgeBase[kbId] || []
  },
}

// ============================================================================
// Create Store
// ============================================================================

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore as useKnowledgeBaseStore }
export type { Document, IngestionBatch, KnowledgeBase } from './types'
