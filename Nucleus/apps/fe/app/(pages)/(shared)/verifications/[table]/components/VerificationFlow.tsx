'use client'

import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import type { DragEvent } from 'react'
import React, { useRef, useState } from 'react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, CheckCircle, Loader2, Save, Workflow, X } from 'lucide-react'
import Link from 'next/link'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { NodeDetailPanel } from './NodeDetailPanel'
import { NodePalette } from './NodePalette'
import {
  NotificationRuleNode,
  type NotificationRuleNodeData,
} from './nodes/NotificationRuleNode'
import { RequirementNode, type RequirementNodeData } from './nodes/RequirementNode'
import { VerificationNode, type VerificationNodeData } from './nodes/VerificationNode'

type VerificationFlowProps = {
  table: string
}

type StepDB = {
  id: string
  step_order: number
  name: string | null
  position_x: string | null
  position_y: string | null
}

type RequirementDB = {
  id: string
  verifier_type: 'user' | 'role' | 'entity_creator' | null
  verifier_id: string | null
  verifier_role: string | null
  is_all_required: boolean
  is_signature_mandatory: boolean
  step_order: number
  connected_from_step_order: number | null
  position_x: string | null
  position_y: string | null
}

type RuleDB = {
  id: string
  requirement_id: string | null
  connected_from_step_order: number | null
  trigger: string
  channel: string
  position_x: string | null
  position_y: string | null
}

type RecipientDB = {
  id: string
  rule_id: string
  recipient_type: 'user' | 'role' | 'all_verifiers' | 'step_verifier'
  recipient_user_id: string | null
  recipient_role_id: string | null
  channel: string
}

const nodeTypes = {
  verification: VerificationNode,
  verifier: RequirementNode,
  notification: NotificationRuleNode,
}

const defaultEdgeOptions = {
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed },
  style: { strokeWidth: 2, stroke: '#94a3b8' },
}

let nodeIdCounter = 0
const getNodeId = (type: string) => `${type}-${Date.now()}-${nodeIdCounter++}`

export function VerificationFlow({ table }: VerificationFlowProps) {
  const actions = useGenericApiActions()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) || null : null

  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  React.useEffect(() => {
    loadFlowFromDB()
  }, [table])

  function loadFlowFromDB() {
    setIsLoading(true)

    if (
      !actions.GET_VERIFICATION_STEPS ||
      !actions.GET_VERIFICATION_REQUIREMENTS ||
      !actions.GET_VERIFICATION_NOTIFICATION_RULES ||
      !actions.GET_VERIFICATION_NOTIFICATION_RECIPIENTS
    ) {
      setIsLoading(false)
      return
    }

    actions.GET_VERIFICATION_STEPS.start({
      payload: {
        page: 1,
        limit: 100,
        filters: { entity_name: table },
        orderBy: 'step_order',
        orderDirection: 'asc',
      },
      onAfterHandle: (stepsData: { data?: StepDB[] } | null) => {
        const steps: StepDB[] = stepsData?.data || []

        actions.GET_VERIFICATION_REQUIREMENTS?.start({
          payload: {
            page: 1,
            limit: 100,
            filters: { entity_name: table },
          },
          onAfterHandle: (reqData: { data?: RequirementDB[] } | null) => {
            const requirements: RequirementDB[] = reqData?.data || []

            actions.GET_VERIFICATION_NOTIFICATION_RULES?.start({
              payload: {
                page: 1,
                limit: 100,
                filters: { entity_name: table },
              },
              onAfterHandle: (rulesData: { data?: RuleDB[] } | null) => {
                const rules: RuleDB[] = rulesData?.data || []
                const ruleIds = rules.map((r) => r.id)

                if (ruleIds.length === 0) {
                  buildFlowFromDB(steps, requirements, rules, [])
                  setIsLoading(false)
                  return
                }

                actions.GET_VERIFICATION_NOTIFICATION_RECIPIENTS?.start({
                  payload: { page: 1, limit: 500 },
                  onAfterHandle: (recipientsData: { data?: RecipientDB[] } | null) => {
                    const allRecipients: RecipientDB[] = recipientsData?.data || []
                    const recipients = allRecipients.filter((r) => ruleIds.includes(r.rule_id))
                    buildFlowFromDB(steps, requirements, rules, recipients)
                    setIsLoading(false)
                  },
                  onErrorHandle: () => setIsLoading(false),
                })
              },
              onErrorHandle: () => setIsLoading(false),
            })
          },
          onErrorHandle: () => setIsLoading(false),
        })
      },
      onErrorHandle: () => setIsLoading(false),
    })
  }

  function buildFlowFromDB(
    steps: StepDB[],
    requirements: RequirementDB[],
    rules: RuleDB[],
    recipients: RecipientDB[]
  ) {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    const stepIdByOrder = new Map<number, string>()

    if (steps.length > 0) {
      steps.forEach((step, index) => {
        const nodeId = `step-${step.id}`
        stepIdByOrder.set(step.step_order, nodeId)
        newNodes.push({
          id: nodeId,
          type: 'verification',
          position: {
            x: step.position_x ? parseFloat(step.position_x) : 400,
            y: step.position_y ? parseFloat(step.position_y) : 100 + index * 200,
          },
          data: {
            label: step.name || `Step ${step.step_order}`,
            stepOrder: step.step_order,
            dbId: step.id,
          } as VerificationNodeData,
        })
      })
    } else if (requirements.length > 0) {
      const stepOrders = [...new Set(requirements.map((r) => r.step_order))].sort((a, b) => a - b)
      stepOrders.forEach((order, index) => {
        const nodeId = `step-${order}`
        stepIdByOrder.set(order, nodeId)
        newNodes.push({
          id: nodeId,
          type: 'verification',
          position: { x: 400, y: 100 + index * 200 },
          data: { label: `Step ${order}`, stepOrder: order } as VerificationNodeData,
        })
      })
    } else {
      newNodes.push({
        id: 'step-1',
        type: 'verification',
        position: { x: 400, y: 100 },
        data: { label: 'Step 1', stepOrder: 1 } as VerificationNodeData,
      })
      stepIdByOrder.set(1, 'step-1')
    }

    requirements.forEach((req, index) => {
      const nodeId = `verifier-${req.id}`
      newNodes.push({
        id: nodeId,
        type: 'verifier',
        position: {
          x: req.position_x ? parseFloat(req.position_x) : 100,
          y: req.position_y ? parseFloat(req.position_y) : 100 + index * 150,
        },
        data: {
          label: getVerifierLabel(req.verifier_type),
          verifierType: req.verifier_type,
          verifierId: req.verifier_id,
          verifierRole: req.verifier_role,
          isAllRequired: req.is_all_required,
          isSignatureMandatory: req.is_signature_mandatory,
          dbId: req.id,
        } as RequirementNodeData,
      })

      const stepNodeId = stepIdByOrder.get(req.step_order)
      if (stepNodeId) {
        newEdges.push({
          id: `edge-${nodeId}-${stepNodeId}`,
          source: nodeId,
          target: stepNodeId,
          sourceHandle: 'right-main',
          targetHandle: 'left',
          ...defaultEdgeOptions,
        })
      }
    })

    requirements.forEach((req) => {
      if (req.connected_from_step_order !== null && req.connected_from_step_order !== undefined) {
        const sourceStepNodeId = stepIdByOrder.get(req.connected_from_step_order)
        const targetVerifierNodeId = `verifier-${req.id}`

        if (sourceStepNodeId) {
          newEdges.push({
            id: `edge-${sourceStepNodeId}-${targetVerifierNodeId}`,
            source: sourceStepNodeId,
            target: targetVerifierNodeId,
            sourceHandle: 'right-main',
            targetHandle: 'left',
            ...defaultEdgeOptions,
          })
        }
      }
    })

    const recipientByRuleId = new Map<string, RecipientDB>()
    for (const r of recipients) {
      recipientByRuleId.set(r.rule_id, r)
    }

    const requirementDbIdToNodeId = new Map<string, string>()
    requirements.forEach((req) => {
      requirementDbIdToNodeId.set(req.id, `verifier-${req.id}`)
    })

    rules.forEach((rule, index) => {
      const recipient = recipientByRuleId.get(rule.id)
      const notificationNodeId = `notification-${rule.id}`

      newNodes.push({
        id: notificationNodeId,
        type: 'notification',
        position: {
          x: rule.position_x ? parseFloat(rule.position_x) : 700,
          y: rule.position_y ? parseFloat(rule.position_y) : 100 + index * 150,
        },
        data: {
          label: 'Notification',
          trigger: rule.trigger,
          channel: rule.channel,
          recipientType: recipient?.recipient_type || 'user',
          recipientId: recipient?.recipient_user_id || recipient?.recipient_role_id || null,
          dbId: rule.id,
          recipientDbId: recipient?.id,
        } as NotificationRuleNodeData,
      })

      if (rule.requirement_id) {
        const verifierNodeId = requirementDbIdToNodeId.get(rule.requirement_id)
        if (verifierNodeId) {
          newEdges.push({
            id: `edge-${verifierNodeId}-${notificationNodeId}`,
            source: verifierNodeId,
            target: notificationNodeId,
            sourceHandle: 'right-notification',
            targetHandle: 'left',
            ...defaultEdgeOptions,
          })
        }
      }

      if (rule.connected_from_step_order !== null && rule.connected_from_step_order !== undefined) {
        const stepNodeId = stepIdByOrder.get(rule.connected_from_step_order)
        if (stepNodeId) {
          newEdges.push({
            id: `edge-${stepNodeId}-${notificationNodeId}`,
            source: stepNodeId,
            target: notificationNodeId,
            sourceHandle: 'right-notification',
            targetHandle: 'left',
            ...defaultEdgeOptions,
          })
        }
      }
    })

    setNodes(newNodes)
    setTimeout(() => {
      setEdges(newEdges)
    }, 100)
  }

  function getVerifierLabel(type: string | null): string {
    switch (type) {
      case 'user':
        return 'User Approval'
      case 'role':
        return 'Role Approval'
      case 'entity_creator':
        return 'Creator Approval'
      default:
        return 'Approval Step'
    }
  }

  function handleSave() {
    setIsSaving(true)
    setSaveMessage(null)

    const stepNodes = nodes.filter((n) => n.type === 'verification')
    const verifierNodes = nodes.filter((n) => n.type === 'verifier')
    const notificationNodes = nodes.filter((n) => n.type === 'notification')

    const verifierToStepOrder = new Map<string, number>()
    edges.forEach((edge) => {
      const sourceIsVerifier = verifierNodes.some((n) => n.id === edge.source)
      const targetStepNode = stepNodes.find((n) => n.id === edge.target)
      if (sourceIsVerifier && targetStepNode) {
        const stepData = targetStepNode.data as VerificationNodeData
        verifierToStepOrder.set(edge.source, stepData.stepOrder)
      }
    })

    const notificationToVerifierId = new Map<string, string>()
    edges.forEach((edge) => {
      const sourceIsVerifier = verifierNodes.some((n) => n.id === edge.source)
      const targetIsNotification = notificationNodes.some((n) => n.id === edge.target)
      if (sourceIsVerifier && targetIsNotification && edge.sourceHandle === 'right-notification') {
        notificationToVerifierId.set(edge.target, edge.source)
      }
    })

    const verifierToConnectedFromStepOrder = new Map<string, number>()
    edges.forEach((edge) => {
      const sourceStepNode = stepNodes.find((n) => n.id === edge.source)
      const targetIsVerifier = verifierNodes.some((n) => n.id === edge.target)
      if (sourceStepNode && targetIsVerifier) {
        const stepData = sourceStepNode.data as VerificationNodeData
        verifierToConnectedFromStepOrder.set(edge.target, stepData.stepOrder)
      }
    })

    const notificationToConnectedFromStepOrder = new Map<string, number>()
    edges.forEach((edge) => {
      const sourceStepNode = stepNodes.find((n) => n.id === edge.source)
      const targetIsNotification = notificationNodes.some((n) => n.id === edge.target)
      if (sourceStepNode && targetIsNotification && edge.sourceHandle === 'right-notification') {
        const stepData = sourceStepNode.data as VerificationNodeData
        notificationToConnectedFromStepOrder.set(edge.target, stepData.stepOrder)
      }
    })

    deleteAllThenCreate(
      stepNodes,
      verifierNodes,
      notificationNodes,
      verifierToStepOrder,
      notificationToVerifierId,
      verifierToConnectedFromStepOrder,
      notificationToConnectedFromStepOrder
    )
  }

  function deleteAllThenCreate(
    stepNodes: Node[],
    verifierNodes: Node[],
    notificationNodes: Node[],
    verifierToStepOrder: Map<string, number>,
    notificationToVerifierId: Map<string, string>,
    verifierToConnectedFromStepOrder: Map<string, number>,
    notificationToConnectedFromStepOrder: Map<string, number>
  ) {
    actions.GET_VERIFICATION_NOTIFICATION_RULES?.start({
      payload: {
        page: 1,
        limit: 100,
        filters: { entity_name: table },
      },
      onAfterHandle: (rulesData: { data?: Array<{ id: string }> } | null) => {
        const rules: { id: string }[] = rulesData?.data || []
        const ruleIds = rules.map((r) => r.id)

        if (ruleIds.length === 0) {
          deleteRequirementsAndStepsThenCreate(
            stepNodes,
            verifierNodes,
            notificationNodes,
            verifierToStepOrder,
            notificationToVerifierId,
            verifierToConnectedFromStepOrder,
            notificationToConnectedFromStepOrder
          )
          return
        }

        actions.GET_VERIFICATION_NOTIFICATION_RECIPIENTS?.start({
          payload: { page: 1, limit: 500 },
          onAfterHandle: (
            recipientsData: { data?: Array<{ id: string; rule_id: string }> } | null
          ) => {
            const allRecipients: { id: string; rule_id: string }[] = recipientsData?.data || []
            const projectRecipients = allRecipients.filter((r) => ruleIds.includes(r.rule_id))

            deleteRecipientsThenContinue(projectRecipients, 0, () => {
              deleteRulesThenContinue(rules, 0, () => {
                deleteRequirementsAndStepsThenCreate(
                  stepNodes,
                  verifierNodes,
                  notificationNodes,
                  verifierToStepOrder,
                  notificationToVerifierId,
                  verifierToConnectedFromStepOrder,
                  notificationToConnectedFromStepOrder
                )
              })
            })
          },
          onErrorHandle: () => finishSaveWithError(),
        })
      },
      onErrorHandle: () => finishSaveWithError(),
    })
  }

  function deleteRequirementsAndStepsThenCreate(
    stepNodes: Node[],
    verifierNodes: Node[],
    notificationNodes: Node[],
    verifierToStepOrder: Map<string, number>,
    notificationToVerifierId: Map<string, string>,
    verifierToConnectedFromStepOrder: Map<string, number>,
    notificationToConnectedFromStepOrder: Map<string, number>
  ) {
    actions.GET_VERIFICATION_REQUIREMENTS?.start({
      payload: {
        page: 1,
        limit: 100,
        filters: { entity_name: table },
      },
      onAfterHandle: (reqData: { data?: Array<{ id: string }> } | null) => {
        const reqs = reqData?.data || []
        deleteRequirementsThenContinue(reqs, 0, () => {
          actions.GET_VERIFICATION_STEPS?.start({
            payload: {
              page: 1,
              limit: 100,
              filters: { entity_name: table },
            },
            onAfterHandle: (stepsData: { data?: Array<{ id: string }> } | null) => {
              const existingSteps = stepsData?.data || []
              deleteStepsThenContinue(existingSteps, 0, () => {
                const requirementNodeIdToDbId = new Map<string, string>()

                createSteps(stepNodes, 0, () => {
                  createRequirementsWithTracking(
                    verifierNodes,
                    verifierToStepOrder,
                    verifierToConnectedFromStepOrder,
                    0,
                    requirementNodeIdToDbId,
                    () => {
                      createNotificationsWithRequirementId(
                        notificationNodes,
                        notificationToVerifierId,
                        requirementNodeIdToDbId,
                        notificationToConnectedFromStepOrder,
                        0,
                        () => {
                          setIsSaving(false)
                          setSaveMessage('Flow saved!')
                          setTimeout(() => setSaveMessage(null), 3000)
                        }
                      )
                    }
                  )
                })
              })
            },
            onErrorHandle: () => finishSaveWithError(),
          })
        })
      },
      onErrorHandle: () => finishSaveWithError(),
    })
  }

  function finishSaveWithError() {
    setIsSaving(false)
    setSaveMessage('Error saving flow')
    setTimeout(() => setSaveMessage(null), 5000)
  }

  function deleteRecipientsThenContinue(items: { id: string }[], idx: number, onDone: () => void) {
    if (idx >= items.length) {
      onDone()
      return
    }
    const item = items[idx]
    if (!item) {
      deleteRecipientsThenContinue(items, idx + 1, onDone)
      return
    }
    actions.DELETE_VERIFICATION_NOTIFICATION_RECIPIENT?.start({
      payload: { _id: item.id },
      onAfterHandle: () => deleteRecipientsThenContinue(items, idx + 1, onDone),
      onErrorHandle: () => deleteRecipientsThenContinue(items, idx + 1, onDone),
    })
  }

  function deleteRulesThenContinue(items: { id: string }[], idx: number, onDone: () => void) {
    if (idx >= items.length) {
      onDone()
      return
    }
    const item = items[idx]
    if (!item) {
      deleteRulesThenContinue(items, idx + 1, onDone)
      return
    }
    actions.DELETE_VERIFICATION_NOTIFICATION_RULE?.start({
      payload: { _id: item.id },
      onAfterHandle: () => deleteRulesThenContinue(items, idx + 1, onDone),
      onErrorHandle: () => deleteRulesThenContinue(items, idx + 1, onDone),
    })
  }

  function deleteRequirementsThenContinue(
    items: { id: string }[],
    idx: number,
    onDone: () => void
  ) {
    if (idx >= items.length) {
      onDone()
      return
    }
    const item = items[idx]
    if (!item) {
      deleteRequirementsThenContinue(items, idx + 1, onDone)
      return
    }
    actions.DELETE_VERIFICATION_REQUIREMENT?.start({
      payload: { _id: item.id },
      onAfterHandle: () => deleteRequirementsThenContinue(items, idx + 1, onDone),
      onErrorHandle: () => deleteRequirementsThenContinue(items, idx + 1, onDone),
    })
  }

  function deleteStepsThenContinue(items: { id: string }[], idx: number, onDone: () => void) {
    if (idx >= items.length) {
      onDone()
      return
    }
    const item = items[idx]
    if (!item) {
      deleteStepsThenContinue(items, idx + 1, onDone)
      return
    }
    actions.DELETE_VERIFICATION_STEP?.start({
      payload: { _id: item.id },
      onAfterHandle: () => deleteStepsThenContinue(items, idx + 1, onDone),
      onErrorHandle: () => deleteStepsThenContinue(items, idx + 1, onDone),
    })
  }

  function createSteps(stepNodes: Node[], idx: number, onDone: () => void) {
    if (idx >= stepNodes.length) {
      onDone()
      return
    }
    const node = stepNodes[idx]
    if (!node) {
      createSteps(stepNodes, idx + 1, onDone)
      return
    }

    const data = node.data as VerificationNodeData

    actions.ADD_VERIFICATION_STEP?.start({
      payload: {
        entity_name: table,
        step_order: data.stepOrder,
        name: data.label,
        position_x: String(node.position.x),
        position_y: String(node.position.y),
      },
      onAfterHandle: () => createSteps(stepNodes, idx + 1, onDone),
      onErrorHandle: () => createSteps(stepNodes, idx + 1, onDone),
    })
  }

  function createRequirementsWithTracking(
    verifierNodes: Node[],
    stepOrderMap: Map<string, number>,
    connectedFromStepOrderMap: Map<string, number>,
    idx: number,
    nodeIdToDbId: Map<string, string>,
    onDone: () => void
  ) {
    if (idx >= verifierNodes.length) {
      onDone()
      return
    }
    const node = verifierNodes[idx]
    if (!node) {
      createRequirementsWithTracking(
        verifierNodes,
        stepOrderMap,
        connectedFromStepOrderMap,
        idx + 1,
        nodeIdToDbId,
        onDone
      )
      return
    }

    const data = node.data as RequirementNodeData
    const stepOrder = stepOrderMap.get(node.id) || 1
    const connectedFromStepOrder = connectedFromStepOrderMap.get(node.id) || null

    actions.ADD_VERIFICATION_REQUIREMENT?.start({
      payload: {
        entity_name: table,
        verifier_type: data.verifierType as 'user' | 'role' | 'entity_creator',
        verifier_id: data.verifierId,
        verifier_role: data.verifierRole,
        is_signature_mandatory: data.isSignatureMandatory,
        connected_from_step_order: connectedFromStepOrder,
        step_order: stepOrder,
        is_all_required: data.isAllRequired,
        position_x: String(node.position.x),
        position_y: String(node.position.y),
      },
      onAfterHandle: (result: { id?: string } | null) => {
        const dbId = result?.id
        if (dbId) {
          nodeIdToDbId.set(node.id, dbId)
        }
        createRequirementsWithTracking(
          verifierNodes,
          stepOrderMap,
          connectedFromStepOrderMap,
          idx + 1,
          nodeIdToDbId,
          onDone
        )
      },
      onErrorHandle: () =>
        createRequirementsWithTracking(
          verifierNodes,
          stepOrderMap,
          connectedFromStepOrderMap,
          idx + 1,
          nodeIdToDbId,
          onDone
        ),
    })
  }

  function createNotificationsWithRequirementId(
    notificationNodes: Node[],
    notificationToVerifierNodeId: Map<string, string>,
    verifierNodeIdToDbId: Map<string, string>,
    notificationToConnectedFromStepOrder: Map<string, number>,
    idx: number,
    onDone: () => void
  ) {
    if (idx >= notificationNodes.length) {
      onDone()
      return
    }
    const node = notificationNodes[idx]
    if (!node) {
      createNotificationsWithRequirementId(
        notificationNodes,
        notificationToVerifierNodeId,
        verifierNodeIdToDbId,
        notificationToConnectedFromStepOrder,
        idx + 1,
        onDone
      )
      return
    }
    const data = node.data as NotificationRuleNodeData

    const verifierNodeId = notificationToVerifierNodeId.get(node.id)
    const requirementDbId = verifierNodeId ? verifierNodeIdToDbId.get(verifierNodeId) : null
    const connectedFromStepOrder = notificationToConnectedFromStepOrder.get(node.id) || null

    actions.ADD_VERIFICATION_NOTIFICATION_RULE?.start({
      payload: {
        entity_name: table,
        requirement_id: requirementDbId || undefined,
        connected_from_step_order: connectedFromStepOrder,
        trigger: data.trigger as
          | 'on_flow_started'
          | 'on_approved'
          | 'on_rejected'
          | 'on_flow_completed',
        channel: data.channel as 'portal' | 'email' | 'both',
        position_x: String(node.position.x),
        position_y: String(node.position.y),
      },
      onAfterHandle: (result: { id?: string } | null) => {
        const ruleId = result?.id
        if (ruleId) {
          const needsUserId = data.recipientType === 'user' && data.recipientId
          const needsRoleId = data.recipientType === 'role' && data.recipientId

          actions.ADD_VERIFICATION_NOTIFICATION_RECIPIENT?.start({
            payload: {
              rule_id: ruleId,
              recipient_type: data.recipientType as
                | 'user'
                | 'role'
                | 'all_verifiers'
                | 'step_verifier',
              recipient_user_id: needsUserId ? data.recipientId : null,
              recipient_role_id: needsRoleId ? data.recipientId : null,
              channel: data.channel as 'portal',
            },
            onAfterHandle: () =>
              createNotificationsWithRequirementId(
                notificationNodes,
                notificationToVerifierNodeId,
                verifierNodeIdToDbId,
                notificationToConnectedFromStepOrder,
                idx + 1,
                onDone
              ),
            onErrorHandle: () =>
              createNotificationsWithRequirementId(
                notificationNodes,
                notificationToVerifierNodeId,
                verifierNodeIdToDbId,
                notificationToConnectedFromStepOrder,
                idx + 1,
                onDone
              ),
          })
        } else {
          createNotificationsWithRequirementId(
            notificationNodes,
            notificationToVerifierNodeId,
            verifierNodeIdToDbId,
            notificationToConnectedFromStepOrder,
            idx + 1,
            onDone
          )
        }
      },
      onErrorHandle: () =>
        createNotificationsWithRequirementId(
          notificationNodes,
          notificationToVerifierNodeId,
          verifierNodeIdToDbId,
          notificationToConnectedFromStepOrder,
          idx + 1,
          onDone
        ),
    })
  }

  function isValidConnection(conn: Edge | Connection): boolean {
    if (!conn.source || !conn.target) return false
    if (conn.source === conn.target) return false
    if (conn.targetHandle !== 'left') return false
    const validSourceHandles = ['right-main', 'right-notification']
    if (!conn.sourceHandle || !validSourceHandles.includes(conn.sourceHandle)) return false
    return true
  }

  function onConnect(params: Connection) {
    setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds))
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/reactflow')
    if (!type || !reactFlowInstance || !reactFlowWrapper.current) return

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    const id = getNodeId(type)
    let newNode: Node

    switch (type) {
      case 'verification': {
        const stepOrder = nodes.filter((n) => n.type === 'verification').length + 1
        newNode = {
          id,
          type: 'verification',
          position,
          data: { label: `Step ${stepOrder}`, stepOrder } as VerificationNodeData,
        }
        break
      }
      case 'verifier':
        newNode = {
          id,
          type: 'verifier',
          position,
          data: {
            label: 'Approval Step',
            verifierType: 'user',
            verifierId: null,
            verifierRole: null,
            isAllRequired: false,
            isSignatureMandatory: false,
          } as RequirementNodeData,
        }
        break
      case 'notification':
        newNode = {
          id,
          type: 'notification',
          position,
          data: {
            label: 'Notification',
            trigger: 'on_approved',
            channel: 'portal',
            recipientType: 'user',
            recipientId: null,
          } as NotificationRuleNodeData,
        }
        break
      default:
        return
    }

    setNodes((nds) => [...nds, newNode])
  }

  function updateNodeData(nodeId: string, newData: Record<string, unknown>) {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    )
  }

  function deleteNode(nodeId: string) {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelectedNodeId(null)
  }

  if (isLoading) {
    return (
      <section
        style={{ height: 'calc(100vh - 88px)' }}
        className="flex w-full items-center justify-center bg-slate-100"
      >
        <article className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500">Loading flow configuration...</p>
        </article>
      </section>
    )
  }

  return (
    <section
      style={{ height: 'calc(100vh - 88px)' }}
      className="flex w-full overflow-hidden bg-slate-100"
    >
      {saveMessage && (
        <aside className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300">
          <article
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
              saveMessage.includes('Error') ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}
          >
            {saveMessage.includes('Error') ? (
              <X className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {saveMessage}
          </article>
        </aside>
      )}

      <NodePalette
        isCollapsed={isPaletteCollapsed}
        onToggle={() => setIsPaletteCollapsed((p) => !p)}
      />

      <article className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <nav className="flex items-center gap-3 min-w-0">
            <Link
              href="/verifications"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <figure className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <Workflow className="h-4 w-4" />
            </figure>
            <hgroup className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 sm:text-lg truncate">
                Flow Builder
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Table: <span className="font-medium text-indigo-600">{table}</span>
              </p>
            </hgroup>
          </nav>

          <nav className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 sm:px-4"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </nav>
        </header>

        <article className="relative flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            isValidConnection={isValidConnection}
            onEdgeClick={(_, edge) => setEdges((eds) => eds.filter((e) => e.id !== edge.id))}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            className="bg-slate-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
            <Controls className="rounded-xl border border-slate-200 bg-white shadow-lg" />
            <MiniMap
              className="rounded-xl border border-slate-200 bg-white shadow-lg"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'verification':
                    return '#8b5cf6'
                  case 'verifier':
                    return '#6366f1'
                  case 'notification':
                    return '#f59e0b'
                  default:
                    return '#94a3b8'
                }
              }}
            />
          </ReactFlow>

          {nodes.length === 0 && (
            <article className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <figure className="text-center">
                <figcaption className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200">
                  <Workflow className="h-8 w-8 text-slate-400" />
                </figcaption>
                <h3 className="text-lg font-semibold text-slate-700">Start building your flow</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Drag components from the left panel to create your verification workflow
                </p>
              </figure>
            </article>
          )}
        </article>
      </article>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onUpdate={(nodeId, data) => updateNodeData(nodeId, data as Record<string, unknown>)}
          onDelete={(nodeId) => deleteNode(nodeId)}
        />
      )}
    </section>
  )
}
