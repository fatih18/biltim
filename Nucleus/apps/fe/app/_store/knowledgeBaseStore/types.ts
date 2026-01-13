// ============================================================================
// Knowledge Base Types - Re-exported from Vorion Factory
// ============================================================================

import type {
  VorionDocumentListItem,
  VorionDocumentResponse,
  VorionIngestionBatchResponse,
  VorionKnowledgeBaseResponse,
  VorionSearchResult,
} from '@/lib/api'

// Re-export types from Vorion
export type KnowledgeBase = VorionKnowledgeBaseResponse
export type Document = VorionDocumentListItem
export type DocumentDetail = VorionDocumentResponse
export type IngestionBatch = VorionIngestionBatchResponse
export type SearchResult = VorionSearchResult

// ============================================================================
// Store Types
// ============================================================================

export type StoreProps = {
  // Knowledge Bases
  knowledgeBases: KnowledgeBase[]
  selectedKnowledgeBase: KnowledgeBase | null
  isLoadingKnowledgeBases: boolean

  // Documents (keyed by knowledge base id)
  documentsByKnowledgeBase: Record<string, Document[]>
  isLoadingDocuments: boolean

  // UI State
  isCreateModalOpen: boolean
  isUploadModalOpen: boolean
  searchQuery: string
}

export type StoreMethods = {
  // Knowledge Base management
  setKnowledgeBases: (kbs: KnowledgeBase[]) => void
  addKnowledgeBase: (kb: KnowledgeBase) => void
  updateKnowledgeBase: (kb: KnowledgeBase) => void
  removeKnowledgeBase: (kbId: string) => void
  selectKnowledgeBase: (kb: KnowledgeBase | null) => void

  // Document management
  setDocumentsForKnowledgeBase: (kbId: string, docs: Document[]) => void
  addDocument: (kbId: string, doc: Document) => void
  updateDocument: (kbId: string, doc: Document) => void
  removeDocument: (kbId: string, docId: string) => void

  // UI
  setCreateModalOpen: (open: boolean) => void
  setUploadModalOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setIsLoadingKnowledgeBases: (loading: boolean) => void
  setIsLoadingDocuments: (loading: boolean) => void

  // Helpers
  getDocumentsForKnowledgeBase: (kbId: string) => Document[]
}

export type Store = StoreProps & StoreMethods
