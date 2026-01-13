'use client'

import {
  addEdge,
  Background,
  type Connection,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  type NodeTypes,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import {
  LuArrowLeft,
  LuBot,
  LuCheck,
  LuChevronRight,
  LuCopy,
  LuDatabase,
  LuFileSearch,
  LuFilter,
  LuGitBranch,
  LuMaximize2,
  LuMenu,
  LuPlay,
  LuPlug,
  LuRedo,
  LuRefreshCw,
  LuSettings2,
  LuShield,
  LuSquare,
  LuStickyNote,
  LuTrash2,
  LuUndo,
  LuUserCheck,
  LuWand,
  LuX,
  LuZap,
} from 'react-icons/lu'
import { cn } from '@/app/_utils'

// ============================================================================
// Node Categories
// ============================================================================

const NODE_CATEGORIES = {
  core: {
    label: 'Core',
    items: [
      { type: 'agent', label: 'Agent', icon: LuBot },
      { type: 'classify', label: 'Classify', icon: LuFilter },
      { type: 'end', label: 'End', icon: LuSquare },
      { type: 'note', label: 'Note', icon: LuStickyNote },
    ],
  },
  tools: {
    label: 'Tools',
    items: [
      { type: 'file_search', label: 'File Search', icon: LuFileSearch },
      { type: 'guardrails', label: 'Guardrails', icon: LuShield },
      { type: 'mcp', label: 'MCP', icon: LuPlug },
    ],
  },
  logic: {
    label: 'Logic',
    items: [
      { type: 'if_else', label: 'If / Else', icon: LuGitBranch },
      { type: 'while', label: 'While', icon: LuRefreshCw },
      { type: 'user_approval', label: 'User Approval', icon: LuUserCheck },
    ],
  },
  data: {
    label: 'Data',
    items: [
      { type: 'transform', label: 'Transform', icon: LuWand },
      { type: 'set_state', label: 'Set State', icon: LuDatabase },
    ],
  },
}

// ============================================================================
// Node Components
// ============================================================================

interface NodeData {
  label: string
  subtitle?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  content?: React.ReactNode
}

function BaseNode({ data, selected }: { data: NodeData; selected?: boolean }) {
  const Icon = data.icon || LuZap

  return (
    <div
      className={cn(
        'relative group min-w-[160px]',
        'bg-white dark:bg-zinc-900',
        'rounded-lg border transition-all duration-150',
        selected
          ? 'border-zinc-900 dark:border-white shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-zinc-300 dark:!bg-zinc-600 !border-0 !-left-1"
      />

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
            <Icon size={14} className="text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {data.label}
            </p>
            {data.subtitle && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-500 truncate">
                {data.subtitle}
              </p>
            )}
          </div>
        </div>

        {data.content && (
          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {data.content}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-zinc-300 dark:!bg-zinc-600 !border-0 !-right-1"
      />
    </div>
  )
}

function StartNode({ selected }: { data: NodeData; selected?: boolean }) {
  return (
    <div
      className={cn(
        'px-4 py-2 rounded-full',
        'bg-zinc-900 dark:bg-white',
        'transition-all duration-150',
        selected && 'ring-2 ring-zinc-900/20 dark:ring-white/20 ring-offset-2'
      )}
    >
      <div className="flex items-center gap-2">
        <LuPlay size={12} className="text-white dark:text-zinc-900" />
        <span className="text-[13px] font-medium text-white dark:text-zinc-900">Start</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-white dark:!bg-zinc-900 !border-0 !-right-1"
      />
    </div>
  )
}

function BranchNode({ data, selected }: { data: NodeData; selected?: boolean }) {
  return (
    <div
      className={cn(
        'relative min-w-[140px]',
        'bg-white dark:bg-zinc-900',
        'rounded-lg border transition-all duration-150',
        selected
          ? 'border-zinc-900 dark:border-white shadow-sm'
          : 'border-zinc-200 dark:border-zinc-800'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-zinc-300 dark:!bg-zinc-600 !border-0 !-left-1"
      />

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
            <LuUserCheck size={14} className="text-zinc-600 dark:text-zinc-400" />
          </div>
          <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
            {data.label || 'Approval'}
          </p>
        </div>

        <div className="space-y-1">
          <div className="relative flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/50">
            <LuCheck size={10} className="text-zinc-500" />
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Approve</span>
            <Handle
              type="source"
              position={Position.Right}
              id="approve"
              className="!w-1.5 !h-1.5 !bg-zinc-400 !border-0 !-right-[5px]"
            />
          </div>
          <div className="relative flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/50">
            <LuX size={10} className="text-zinc-500" />
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Reject</span>
            <Handle
              type="source"
              position={Position.Right}
              id="reject"
              className="!w-1.5 !h-1.5 !bg-zinc-400 !border-0 !-right-[5px]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  base: BaseNode,
  start: StartNode,
  branch: BranchNode,
}

// ============================================================================
// Initial Data
// ============================================================================

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 80, y: 180 },
    data: { label: 'Start' },
  },
  {
    id: 'file_search',
    type: 'base',
    position: { x: 280, y: 100 },
    data: {
      label: 'File Search',
      subtitle: 'documents',
      icon: LuFileSearch,
    },
  },
  {
    id: 'approval',
    type: 'branch',
    position: { x: 480, y: 160 },
    data: { label: 'User Approval' },
  },
  {
    id: 'mcp',
    type: 'base',
    position: { x: 700, y: 180 },
    data: {
      label: 'MCP',
      subtitle: 'Outlook Email',
      icon: LuPlug,
      content: (
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-400">Tool</span>
            <span className="text-zinc-600 dark:text-zinc-300">fetch_message</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Auth</span>
            <span className="text-zinc-600 dark:text-zinc-300">OAuth</span>
          </div>
        </div>
      ),
    },
  },
]

const initialEdges: Edge[] = [
  {
    id: 'e1',
    source: 'start',
    target: 'file_search',
    style: { stroke: '#71717a', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#71717a', width: 16, height: 16 },
  },
  {
    id: 'e2',
    source: 'file_search',
    target: 'approval',
    style: { stroke: '#d4d4d8', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#d4d4d8', width: 16, height: 16 },
  },
  {
    id: 'e3',
    source: 'approval',
    sourceHandle: 'approve',
    target: 'mcp',
    style: { stroke: '#71717a', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#71717a', width: 16, height: 16 },
  },
]

// ============================================================================
// Sidebar
// ============================================================================

function NodePalette({ onDragStart }: { onDragStart: (type: string, data: NodeData) => void }) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'core',
    'tools',
    'logic',
    'data',
  ])

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  return (
    <div className="w-56 h-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Components</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {Object.entries(NODE_CATEGORIES).map(([key, category]) => (
          <div key={key} className="mb-1">
            <button
              type="button"
              onClick={() => toggleCategory(key)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                {category.label}
              </span>
              <LuChevronRight
                size={12}
                className={cn(
                  'text-zinc-400 transition-transform',
                  expandedCategories.includes(key) && 'rotate-90'
                )}
              />
            </button>

            {expandedCategories.includes(key) && (
              <div className="px-2 py-1 space-y-0.5">
                {category.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      type="button"
                      key={item.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/reactflow', item.type)
                        onDragStart(item.type, { label: item.label, icon: item.icon })
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left',
                        'hover:bg-zinc-100 dark:hover:bg-zinc-900',
                        'cursor-grab active:cursor-grabbing',
                        'transition-colors'
                      )}
                    >
                      <Icon size={14} className="text-zinc-400" />
                      <span className="text-[13px] text-zinc-600 dark:text-zinc-400">
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Properties Panel
// ============================================================================

function PropertiesPanel({
  selectedNode,
  onClose,
}: {
  selectedNode: Node | null
  onClose: () => void
}) {
  if (!selectedNode) return null

  const data = selectedNode.data as unknown as NodeData

  return (
    <div className="w-72 h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{data.label}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
          >
            <LuCopy size={14} />
          </button>
          <button
            type="button"
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-red-500 transition-colors"
          >
            <LuTrash2 size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
          >
            <LuX size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="node-name"
              className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
            >
              Name
            </label>
            <input
              id="node-name"
              type="text"
              defaultValue={data.label}
              className={cn(
                'w-full px-2.5 py-1.5 rounded border text-[13px]',
                'bg-white dark:bg-zinc-900',
                'border-zinc-200 dark:border-zinc-800',
                'text-zinc-900 dark:text-zinc-100',
                'focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600'
              )}
            />
          </div>

          <div>
            <label
              htmlFor="node-tool"
              className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
            >
              Tool
            </label>
            <select
              id="node-tool"
              className={cn(
                'w-full px-2.5 py-1.5 rounded border text-[13px]',
                'bg-white dark:bg-zinc-900',
                'border-zinc-200 dark:border-zinc-800',
                'text-zinc-900 dark:text-zinc-100',
                'focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600'
              )}
              defaultValue="fetch_message"
            >
              <option value="fetch_message">fetch_message</option>
              <option value="send_email">send_email</option>
              <option value="list_folders">list_folders</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="node-approval"
              className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
            >
              Require Approval
            </label>
            <select
              id="node-approval"
              className={cn(
                'w-full px-2.5 py-1.5 rounded border text-[13px]',
                'bg-white dark:bg-zinc-900',
                'border-zinc-200 dark:border-zinc-800',
                'text-zinc-900 dark:text-zinc-100',
                'focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600'
              )}
              defaultValue="always"
            >
              <option value="always">Always</option>
              <option value="never">Never</option>
              <option value="on_error">On Error</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function WorkflowDetailPage() {
  const params = useParams()
  const _workflowId = params.id as string

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isDraft] = useState(true)

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            style: { stroke: '#d4d4d8', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#d4d4d8', width: 16, height: 16 },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragStart = useCallback((_type: string, _data: NodeData) => {
    // Will be used with onDrop
  }, [])

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between h-12 px-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/pocs/vorion/workflows"
            className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
          >
            <LuArrowLeft size={16} />
          </Link>

          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />

          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
              New workflow
            </span>
            {isDraft && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                Draft
              </span>
            )}
          </div>
        </div>

        {/* Center */}
        <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5">
          <button
            type="button"
            className="px-2.5 py-1 rounded text-[12px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            Design
          </button>
          <button
            type="button"
            className="px-2.5 py-1 rounded text-[12px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Code
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
          >
            <LuSettings2 size={16} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
          >
            <LuMenu size={16} />
          </button>
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <LuPlay size={14} />
            Test
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Publish
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <NodePalette onDragStart={handleDragStart} />

        {/* Canvas */}
        <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-900">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-transparent"
          >
            <Background
              gap={24}
              size={1}
              color="currentColor"
              className="text-zinc-200 dark:text-zinc-800"
            />

            {/* Bottom Toolbar */}
            <Panel position="bottom-center" className="mb-3">
              <div className="flex items-center gap-0.5 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
                  title="Fit View"
                >
                  <LuMaximize2 size={14} />
                </button>
                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
                  title="Undo"
                >
                  <LuUndo size={14} />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
                  title="Redo"
                >
                  <LuRedo size={14} />
                </button>
              </div>
            </Panel>

            <MiniMap
              className="!bg-white dark:!bg-zinc-950 !border !border-zinc-200 dark:!border-zinc-800 !rounded-lg !shadow-sm"
              nodeColor={() => '#71717a'}
              maskColor="rgba(0, 0, 0, 0.03)"
              style={{ width: 120, height: 80 }}
            />
          </ReactFlow>
        </div>

        <PropertiesPanel selectedNode={selectedNode} onClose={() => setSelectedNode(null)} />
      </div>
    </div>
  )
}
