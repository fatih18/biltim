'use client'

import * as AllSchemas from '@monorepo/db-entities/schemas'
import type { HybridSearchConfig } from '@monorepo/generics'
import {
  Background,
  ConnectionMode,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type NodeTypes,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { AddTableForm } from './AddTableFormComplete'
import { Legend } from './Legend'
import { TableNode } from './TableNode'

type SchemaModule = {
  tablename: string
  columns: Record<string, unknown>
  SearchConfig?: HybridSearchConfig
  excluded_methods?: string[]
  is_formdata?: boolean
}

type RelationEdgeData = {
  relationName: string
  relationType?: string
  sourceField: string
  targetField: string
  sourceTable: string
  targetTable: string
}

function generateSchemaGraph() {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const schemas = Object.entries(AllSchemas)

  // Hierarchical layout için root node'ları bul
  const schemaConnections = new Map<string, Set<string>>()

  schemas.forEach(([schemaKey, schema]) => {
    const typedSchema = schema as SchemaModule
    const tableName = typedSchema.SearchConfig?.table_name ?? schemaKey
    schemaConnections.set(tableName, new Set())

    typedSchema.SearchConfig?.relations?.forEach((relation) => {
      if (relation.targetTable) {
        schemaConnections.get(tableName)?.add(relation.targetTable)
      }
    })
  })

  // Grid layout constants
  const gridCols = 3
  const nodeWidth = 350
  const horizontalGap = 180
  const verticalGap = 120

  // İlk geçiş: Her satırın max yüksekliğini hesapla
  const rowHeights: number[] = []
  const nodeHeights: number[] = []

  schemas.forEach(([_schemaKey, schema], index) => {
    const typedSchema = schema as SchemaModule
    const row = Math.floor(index / gridCols)

    // Bu node için dinamik height hesapla
    const fieldCount = Object.keys(typedSchema.SearchConfig?.fields || {}).length
    const relationCount = typedSchema.SearchConfig?.relations?.length || 0

    const headerHeight = 70
    const fieldHeight = 45
    const relationHeight = relationCount > 0 ? 80 + relationCount * 45 : 0
    const metadataHeight = 50
    const padding = 20

    const nodeHeight =
      headerHeight + fieldCount * fieldHeight + relationHeight + metadataHeight + padding
    nodeHeights[index] = nodeHeight

    // Bu satırın max yüksekliğini güncelle
    if (!rowHeights[row] || nodeHeight > rowHeights[row]) {
      rowHeights[row] = nodeHeight
    }
  })

  // İkinci geçiş: Node'ları oluştur
  schemas.forEach(([schemaKey, schema], index) => {
    const typedSchema = schema as SchemaModule
    const tableName = typedSchema.SearchConfig?.table_name ?? schemaKey

    const col = index % gridCols
    const row = Math.floor(index / gridCols)

    // Y pozisyonunu önceki satırların toplam yüksekliğinden hesapla
    let yPosition = 0
    for (let i = 0; i < row; i++) {
      yPosition += (rowHeights[i] || 0) + verticalGap
    }

    // Her tablo için bir node oluştur
    nodes.push({
      id: tableName,
      type: 'tableNode',
      position: {
        x: col * (nodeWidth + horizontalGap),
        y: yPosition,
      },
      data: {
        tableName: typedSchema.tablename,
        displayName: tableName,
        fields: typedSchema.SearchConfig?.fields || {},
        relations: typedSchema.SearchConfig?.relations || [],
        excludedMethods: typedSchema.excluded_methods || [],
        isFormData: typedSchema.is_formdata || false,
      },
    })

    // İlişkilerden edge'leri oluştur
    if (typedSchema.SearchConfig?.relations) {
      typedSchema.SearchConfig.relations.forEach((relation) => {
        if (!relation.targetTable) return

        // Many-to-many relations'ları atla (junction table)
        if (relation.type === 'many-to-many') return

        const edgeId = `${tableName}-${relation.name}-${relation.targetTable}`

        // Target table'daki foreignKey field'ının gerçekten var olduğunu kontrol et
        const targetSchema = schemas.find(([_key, schema]) => {
          const s = schema as SchemaModule
          return s.SearchConfig?.table_name === relation.targetTable
        })

        if (!targetSchema) return

        const targetSchemaData = targetSchema[1] as SchemaModule
        const targetFields = targetSchemaData.SearchConfig?.fields || {}

        // ForeignKey field'ı yoksa bu relation'ı atla (polymorphic olabilir)
        if (relation.foreignKey && !targetFields[relation.foreignKey]) {
          return
        }
        const sourceField = 'id'
        const targetField = relation.foreignKey ?? 'id'
        const sourceTableName = typedSchema.tablename
        const targetTableName = targetSchemaData.tablename

        // Varsayılan olarak sağdan çık, sola gir
        const sourceHandle = `${sourceTableName}-${sourceField}-right`
        const targetHandle = `${targetTableName}-${targetField}-left`

        const edgeColor =
          relation.type === 'one-to-one'
            ? '#10b981'
            : relation.type === 'one-to-many'
              ? '#3b82f6'
              : '#8b5cf6'

        edges.push({
          id: edgeId,
          source: tableName,
          target: relation.targetTable,
          sourceHandle,
          targetHandle,
          type: 'smoothstep',
          animated: false,
          data: {
            relationName: relation.name,
            relationType: relation.type,
            sourceField,
            targetField,
            sourceTable: sourceTableName,
            targetTable: targetTableName,
          } satisfies RelationEdgeData,
          style: {
            stroke: edgeColor,
            strokeWidth: 2,
            strokeOpacity: 0.6,
          },
          markerEnd: {
            type: 'arrowclosed',
            width: 12,
            height: 12,
            color: edgeColor,
          },
        })
      })
    }
  })

  return { nodes, edges }
}

export function SchemaVisualizer() {
  const [showAddForm, setShowAddForm] = useState(false)

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => generateSchemaGraph(), [])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const updateEdgeHandles = useEffectEvent(() => {
    setEdges((currentEdges) => {
      let changed = false

      const updatedEdges = currentEdges.map((edge) => {
        const edgeData = edge.data as RelationEdgeData | undefined
        if (!edgeData) {
          return edge
        }

        const sourceNode = nodes.find((node) => node.id === edge.source)
        const targetNode = nodes.find((node) => node.id === edge.target)

        if (!sourceNode || !targetNode) {
          return edge
        }

        const targetIsRight = targetNode.position.x >= sourceNode.position.x

        const newSourceHandle = `${edgeData.sourceTable}-${edgeData.sourceField}-${targetIsRight ? 'right' : 'left'}`
        const newTargetHandle = `${edgeData.targetTable}-${edgeData.targetField}-${targetIsRight ? 'left' : 'right'}`

        if (edge.sourceHandle === newSourceHandle && edge.targetHandle === newTargetHandle) {
          return edge
        }

        changed = true
        return {
          ...edge,
          sourceHandle: newSourceHandle,
          targetHandle: newTargetHandle,
        }
      })

      return changed ? updatedEdges : currentEdges
    })
  })

  useEffect(() => {
    updateEdgeHandles()
  }, [nodes, updateEdgeHandles])

  useEffect(() => {
    const timer = setTimeout(() => {
      updateEdgeHandles()
    }, 100)

    return () => clearTimeout(timer)
  }, [updateEdgeHandles])

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      tableNode: TableNode,
    }),
    []
  )

  const handleAddTable = (schema: {
    tableName: string
    displayName: string
    fields: Array<{ name: string; column: string; drizzleType: string }>
    relations: Array<{ name: string; type: string; targetTable: string }>
  }) => {
    console.log('New table schema:', schema)
    // TODO: Implement adding to graph dynamically
    setShowAddForm(false)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#f9fafb',
        overflow: 'hidden',
      }}
    >
      {showAddForm && <AddTableForm onClose={() => setShowAddForm(false)} onAdd={handleAddTable} />}

      {/* Add Table Button - System themed, bottom left */}
      <button
        onClick={() => setShowAddForm(true)}
        className="absolute bottom-6 left-6 z-20 flex items-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all group"
        type="button"
      >
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
        <span className="font-semibold">New Schema</span>
      </button>

      <Legend />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.15,
          includeHiddenNodes: false,
          minZoom: 0.15,
          maxZoom: 1,
        }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.25 }}
        attributionPosition="bottom-left"
      >
        <Background gap={16} size={1} />
        <Controls position="top-left" />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          position="bottom-right"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 10,
          }}
        />
      </ReactFlow>
    </div>
  )
}
