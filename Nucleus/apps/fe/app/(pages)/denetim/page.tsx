'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Dexie, { type Table } from 'dexie'

import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useGetUserRole } from '@/app/_hooks/user/useGetUserRole'
import { UploadedFileInfo, useUploadAnswerPhoto } from '../bulgular/hooks/useUploadAnswersPhoto'
import { Question, questions as FALLBACK_QUESTIONS, StepCode, steps as FALLBACK_STEPS, Step } from './constants'
import { DateInput } from '@/app/_components/DateInput'

/* ───────────────────────────── Types ───────────────────────────── */
type Rating = 'good' | 'medium' | 'bad'
type FindingType = string
type ActionToTake = string

interface QuestionAnswer {
  questionId: string
  rating: Rating | null
  explanation: string
  photos: File[]
  findingType: FindingType | null
  actionToTake?: ActionToTake | null
  dueDate?: string
  locationName?: string
}

interface AuditFormHeader {
  teamName: string
  department: string
  auditorName: string
  date: string // YYYY-MM-DD
}

type AnswersState = Record<string, QuestionAnswer>

type PlanRow = {
  id: string
  is_active: boolean
  planned_date: string
  location_id: string
  assigned_team_id: string
  status: string
  audit_id: string | null
}

type TeamRow = {
  id: string
  name: string
  leader_user_id: string | null
  is_active: boolean
}

type TeamMemberRowLite = {
  id: string
  team_id: string
  user_id: string
  is_active: boolean
}

type LocationRow = {
  id: string
  name: string
  is_active: boolean
  field_manager_user_ids?: string[] | null
  manager_user_id?: string | null
}

type MasterRow = {
  id?: string
  name?: string
  label?: string
  value?: string
  code?: string
  slug?: string
  key?: string
  is_active?: boolean
}

type FiveSFindingLite = {
  id: string
  finding_no?: number | null
  detected_date?: string
  location_name?: string
  finding_type?: string
  status?: string
  description?: string | null
  action_to_take?: string | null
  due_date?: string | null
  responsible_name?: string | null

  photo_before_url?: string | null
  photo_before_file_id?: string | null
  photo_before_files?: Array<{ file_id: string | null; url: string | null }> | null
}

type PhotoItem = { file_id?: string | null; url?: string | null }

/* ───────────────────────────── Consts ───────────────────────────── */
const ratingFactor: Record<Rating, number> = {
  good: 1,
  medium: 0.5,
  bad: 0,
}

const TARGET_SCORE = 75

const PLAN_KEYS = { GET: 'GET_FIVE_S_AUDIT_PLANS', UPDATE: 'UPDATE_FIVE_S_AUDIT_PLAN' } as const
const USERS_KEYS = { GET: 'GET_USERS' } as const
const TEAM_KEYS = { GET: 'GET_FIVE_S_AUDIT_TEAMS' } as const
const TEAM_MEMBER_KEYS = { GET: 'GET_FIVE_S_AUDIT_TEAM_MEMBERS' } as const
const LOC_KEYS = { GET: 'GET_FIVE_S_LOCATIONS' } as const

const FINDING_TYPE_KEYS = { GET: 'GET_FIVE_S_FINDING_TYPES' } as const
const ACTION_KEYS = { GET: 'GET_FIVE_S_ACTIONS' } as const
const FINDINGS_KEYS = { GET: 'GET_FIVE_S_FINDINGS' } as const
const STEP_KEYS = { GET: 'GET_FIVE_S_STEPS' } as const
const QUESTION_KEYS = { GET: 'GET_FIVE_S_QUESTIONS' } as const

const ME_KEY = 'GET_ME_V2' as const


/* ───────────────────────────── Helpers ───────────────────────────── */
function formatScore(value: number | undefined) {
  if (value == null || Number.isNaN(value)) return '-'
  return value.toFixed(2)
}

function ensureAnswer(prev: AnswersState, questionId: string): QuestionAnswer {
  return (
    prev[questionId] ?? {
      questionId,
      rating: null,
      explanation: '',
      photos: [],
      findingType: null,
      actionToTake: null,
      dueDate: '',
      locationName: '',
    }
  )
}

function isExplanationRequired(q: Question, ans?: QuestionAnswer) {
  if (!ans || !ans.rating) return false
  return q.requireExplanation && ans.rating !== 'good'
}

function mergeFilesUnique(prev: File[], incoming: File[]) {
  const key = (f: File) => `${f.name}__${f.size}__${f.lastModified}`
  const seen = new Set(prev.map(key))
  const next = [...prev]
  for (const f of incoming) {
    const k = key(f)
    if (!seen.has(k)) {
      next.push(f)
      seen.add(k)
    }
  }
  return next
}

function toPhotoArr(ups: UploadedFileInfo[]) {
  return (ups ?? [])
    .filter((x) => x?.fileId || x?.fileUrl)
    .map((x) => ({
      file_id: x?.fileId ?? null,
      url: x?.fileUrl ?? null,
    }))
}

function buildFileUrl(fileId: string) {
  return `/api/view-file/${encodeURIComponent(fileId)}`
}

function extractUuidMaybe(input: string): string | null {
  const m =
    input.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    ) ?? null
  return m?.[0] ?? null
}

function resolvePhotoUrl(p: PhotoItem) {
  if (p?.file_id) return buildFileUrl(p.file_id)

  const u = (p?.url ?? '').trim()
  if (u) {
    const uuid = extractUuidMaybe(u)
    if (uuid) return buildFileUrl(uuid)

    if (u.startsWith('http')) return u
    return u
  }

  return null
}

function normalizeBeforePhotos(f: FiveSFindingLite | null): PhotoItem[] {
  if (!f) return []
  const beforeArr = Array.isArray(f.photo_before_files) ? f.photo_before_files : []

  const fromLegacy =
    !beforeArr.length && (f.photo_before_file_id || f.photo_before_url)
      ? [{ file_id: f.photo_before_file_id ?? null, url: f.photo_before_url ?? null }]
      : []

  const clean = (arr: PhotoItem[]) => (arr ?? []).filter((x) => x?.file_id || x?.url)
  return clean(beforeArr.length ? beforeArr : fromLegacy)
}

function getBeforePhotoResolvedUrls(f: FiveSFindingLite | null) {
  const items = normalizeBeforePhotos(f)
  const urls = items.map(resolvePhotoUrl).filter(Boolean) as string[]
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    if (!seen.has(u)) {
      seen.add(u)
      out.push(u)
    }
  }
  return out
}

function safeStart(A: any, key: string) {
  const entry = A?.[key]
  if (!entry?.start) return null
  return entry.start as (args: any) => void
}

function extractArray(res: any): any[] {
  const candidates = [res?.response?.data, res?.data?.data, res?.data, res]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
    if (Array.isArray(c?.data)) return c.data
  }
  return []
}

function normalizeDateYYYYMMDD(value: string): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = String(d.getFullYear()).padStart(4, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function toSelectOptions(items: MasterRow[]) {
  return (items ?? [])
    .filter((x) => x && (x.is_active == null || x.is_active === true))
    .map((x) => {
      const value = String(x.value ?? x.code ?? x.slug ?? x.key ?? x.name ?? x.id ?? '')
      const label = String(x.label ?? x.name ?? x.value ?? x.code ?? x.slug ?? value)
      return { value, label }
    })
    .filter((x) => x.value.trim().length > 0)
}

function normLoc(s: string) {
  return (s ?? '').trim().toLocaleLowerCase('tr')
}

function makeDraftKey(planId: string | null, header: AuditFormHeader) {
  // plan varsa planId’ye göre; yoksa lokasyon+tarih’e göre
  const dep = (header.department ?? '').trim()
  const date = (header.date ?? '').trim()
  return planId ? `plan:${planId}` : `noplan:${dep}__${date}`
}

function makeUid(prefix = 'local') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

/* ───────────────────────────── Offline Dexie ───────────────────────────── */
/**
 * ✅ Tek dosyada “offline queue + draft”:
 * - Draft: form state (header + answers) (foto hariç metadata; foto bloblar queue’da)
 * - Submission queue: audit + findings payload + foto bloblar
 *
 * Not: Dexie Blob destekler. Photo’ları Blob olarak saklayıp sync sırasında File’a çeviriyoruz.
 */

type DraftRow = {
  id: string // draftKey
  updatedAt: number
  planId: string | null
  header: AuditFormHeader
  answers: Omit<QuestionAnswer, 'photos'>[] & any // photos saklamıyoruz (blob ağır) — sadece queue’da
}

type OfflineFindingPayload = {
  questionId: string | 'SINGLE'
  client_finding_id: string  
  detected_date: string // YYYY-MM-DD
  location_name: string
  finding_type: string
  description: string
  action_to_take: string
  due_date?: string
  responsible_name: string
  responsible_user_id?: string | null // Madde 26
  auditor_name?: string
  // photo_before_files, primary vs syncte hesaplanacak
  // photo blobs eşleşmesi: submissionPhoto table
}

type OfflineAuditSubmission = {
  id: string // local submission id
  createdAt: number
  planId: string | null
  header: AuditFormHeader
  auditPayload: {
    department_name: string
    auditor_name: string
    audit_date: string // YYYY-MM-DD
    total_score: string
    target_score: string
    score_s1: string
    score_s2: string
    score_s3: string
    score_s4: string
    score_s5: string
  }
  findings: OfflineFindingPayload[]
  // status info
  lastError?: string | null
}

type SubmissionPhotoRow = {
  id: string
  submissionId: string
  questionId: string // questionId or 'SINGLE'
  name: string
  type: string
  size: number
  lastModified: number
  blob: Blob
}

class FiveSOfflineDB extends Dexie {
  drafts!: Table<DraftRow, string>
  submissions!: Table<OfflineAuditSubmission, string>
  submissionPhotos!: Table<SubmissionPhotoRow, string>

  constructor() {
    super('fiveS_offline_db_v1')
    this.version(1).stores({
      drafts: 'id, updatedAt, planId',
      submissions: 'id, createdAt, planId',
      submissionPhotos: 'id, submissionId, questionId',
    })
  }
}

const db = typeof window !== 'undefined' ? new FiveSOfflineDB() : (null as any)

/* ───────────────────────────── Page ───────────────────────────── */
export default function FiveSAuditFormPage() {
  const actions = useGenericApiActions()
  const { uploadAnswerPhoto } = useUploadAnswerPhoto()
  const { roleName, roles, isLoading: roleLoading } = useGetUserRole()

  const [questions, setQuestions] = useState<Question[]>(FALLBACK_QUESTIONS)
  const [steps, setSteps] = useState<Step[]>(FALLBACK_STEPS)

  const [findingTypeOptions, setFindingTypeOptions] = useState<Array<{ value: string; label: string }>>([])
  const [actionToTakeOptions, setActionToTakeOptions] = useState<Array<{ value: string; label: string }>>([])
  const [locationNameOptions, setLocationNameOptions] = useState<string[]>([])

  const [header, setHeader] = useState<AuditFormHeader>({
    teamName: '',
    department: '',
    auditorName: '',
    date: new Date().toISOString().slice(0, 10),
  })

  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(() =>
    Object.fromEntries(
      FALLBACK_QUESTIONS.map((q) => [
        q.id,
        {
          questionId: q.id,
          rating: null,
          explanation: '',
          photos: [],
          findingType: null,
          actionToTake: null,
          dueDate: '',
          locationName: '',
        },
      ])
    )
  )

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  const [activeDetailQuestionId, setActiveDetailQuestionId] = useState<string | null>(null)

  const [singleFindingOpen, setSingleFindingOpen] = useState(false)
  const [singleFinding, setSingleFinding] = useState<{
    findingType: FindingType | ''
    explanation: string
    photos: File[]
    actionToTake: ActionToTake | ''
    dueDate: string
    linkedQuestionId: string
  }>({
    findingType: '',
    explanation: '',
    photos: [],
    actionToTake: '',
    dueDate: '',
    linkedQuestionId: '',
  })

  const [assignmentLoading, setAssignmentLoading] = useState(true)
  const [assignedPlan, setAssignedPlan] = useState<PlanRow | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  // Madde 17: çoklu plan seçimi
  const [availablePlans, setAvailablePlans] = useState<PlanRow[]>([])
  const [planSelectionMode, setPlanSelectionMode] = useState(false)
  const [planMetaMap, setPlanMetaMap] = useState<Record<string, { locationName: string; teamName: string }>>({})

  // Madde 15: eksik soru işaretleme
  const [missingQuestions, setMissingQuestions] = useState<Set<string>>(new Set())

  // Madde 18: ekip üyesi dropdown
  const [teamMemberOptions, setTeamMemberOptions] = useState<Array<{ id: string; name: string }>>([])

  // Madde 26: lokasyon → sorumlu user eşlemesi (key: normLoc(name))
  const [locationResponsibleMap, setLocationResponsibleMap] = useState<
    Map<string, { userId: string; userName: string }>
  >(new Map())

  // Madde 25: plan tamamlama
  const [planUpdateKey] = useState(() => PLAN_KEYS.UPDATE)

  const [findingsLoading, setFindingsLoading] = useState(false)
  const [findings, setFindings] = useState<FiveSFindingLite[]>([])
  const [activeFinding, setActiveFinding] = useState<FiveSFindingLite | null>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Offline / Sync UI
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [syncing, setSyncing] = useState(false)
  const [queuedCount, setQueuedCount] = useState<number>(0)
  const draftSaveTimer = useRef<number | null>(null)

  const openDetailModal = (questionId: string) => {
    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      if (!current.locationName?.trim()) {
        return { ...prev, [questionId]: { ...current, locationName: header.department } }
      }
      return prev
    })
    setActiveDetailQuestionId(questionId)
  }
  const closeDetailModal = () => setActiveDetailQuestionId(null)

  const openSingleFindingModal = () => {
    setSingleFinding((prev) => ({
      ...prev,
      dueDate: prev.dueDate || header.date,
      linkedQuestionId: '',
    }))
    setSingleFindingOpen(true)
  }
  const closeSingleFindingModal = () => setSingleFindingOpen(false)

  const canCreateSingleFinding = useMemo(() => {
    if (roleLoading) return false
    const norm = (v: string) => (v ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
    const all = [roleName ?? '', ...(roles ?? []).map((r) => r.name ?? '')].map(norm)
    return all.includes(norm('content manager core team')) || all.includes(norm('manager'))
  }, [roleName, roles, roleLoading])

  const stepScores = useMemo(() => {
  const scores: Record<StepCode, number> = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 }

  for (const step of steps) {
    const qs = questions.filter((q) => q.stepCode === step.code)

    const rawMax = qs.reduce((sum, q) => sum + (q.maxScore ?? 0), 0)

    const rawEarned = qs.reduce((sum, q) => {
      const ans = answers[q.id]
      if (!ans?.rating) return sum
      return sum + (q.maxScore ?? 0) * ratingFactor[ans.rating]
    }, 0)

    const scale = rawMax > 0 ? step.maxScore / rawMax : 0
    scores[step.code] = rawEarned * scale
  }

  return scores
}, [answers, questions, steps])
  const totalScore = useMemo(
    () => (Object.values(stepScores) as number[]).reduce((a, b) => a + b, 0),
    [stepScores]
  )

  // Gerçek zamanlı eksik/tamamlanmamış soru seti
  const liveUnanswered = useMemo(() => {
    const s = new Set<string>()
    for (const q of questions) {
      const ans = answers[q.id]
      if (!ans || !ans.rating) { s.add(q.id); continue }
      if (isExplanationRequired(q, ans) && !ans.explanation.trim()) s.add(q.id)
      if (ans.rating !== 'good') {
        if (!ans.findingType) s.add(q.id)
        if (!ans.actionToTake?.trim()) s.add(q.id)
        if (!ans.dueDate) s.add(q.id)
        const loc = (ans.locationName?.trim() || header.department || '').trim()
        if (!loc) s.add(q.id)
      }
    }
    return s
  }, [questions, answers, header.department])

  // Kaydet butonuna basıldıktan sonra highlight'lar aktif olsun
  const [hasAttempted, setHasAttempted] = useState(false)

  const startAsPromise = (startFn: any, args: any) =>
    new Promise<any>((resolve, reject) => {
      if (!startFn) return reject(new Error('action.start not found'))
      startFn({
        ...args,
        onAfterHandle: (data: any) => {
          args?.onAfterHandle?.(data)
          resolve(data)
        },
        onErrorHandle: (err: any) => {
          args?.onErrorHandle?.(err)
          reject(err)
        },
      })
    })

  const handleHeaderChange = (field: keyof AuditFormHeader, value: string) => {
    setHeader((prev) => ({ ...prev, [field]: value }))
  }

  const handleRatingChange = (questionId: string, rating: Rating) => {
    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      const next: AnswersState = { ...prev, [questionId]: { ...current, rating } }
      return next
    })
    if (rating !== 'good') openDetailModal(questionId)
  }

  const handleExplanationChange = (questionId: string, explanation: string) => {
    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      const next: AnswersState = { ...prev, [questionId]: { ...current, explanation } }
      return next
    })
  }

  const handlePhotosAdd = (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    const incoming = Array.from(files)

    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      return {
        ...prev,
        [questionId]: {
          ...current,
          photos: mergeFilesUnique(current.photos ?? [], incoming),
        },
      }
    })
  }

  const handlePhotoRemove = (questionId: string, index: number) => {
    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      const nextPhotos = (current.photos ?? []).filter((_, i) => i !== index)
      return { ...prev, [questionId]: { ...current, photos: nextPhotos } }
    })
  }

  const handleFindingTypeChange = (questionId: string, findingType: FindingType | null) => {
    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      const next: AnswersState = { ...prev, [questionId]: { ...current, findingType } }
      return next
    })
  }

  const handleActionToTakeChange = (questionId: string, value: ActionToTake | null) => {
    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      return { ...prev, [questionId]: { ...current, actionToTake: value } }
    })
  }

  const handleDueDateChange = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      return { ...prev, [questionId]: { ...current, dueDate: value } }
    })
  }

  const handleLocationChange = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      return { ...prev, [questionId]: { ...current, locationName: value } }
    })
  }

  const toggleExpanded = (questionId: string) => {
    setExpanded((prev) => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  const handleSingleFindingFieldChange = <K extends keyof typeof singleFinding>(
    field: K,
    value: (typeof singleFinding)[K]
  ) => {
    setSingleFinding((prev) => ({ ...prev, [field]: value }))
  }

  const handleSingleFindingPhotosAdd = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const incoming = Array.from(files)
    setSingleFinding((prev) => ({
      ...prev,
      photos: mergeFilesUnique(prev.photos ?? [], incoming),
    }))
  }

  const handleSingleFindingPhotoRemove = (index: number) => {
    setSingleFinding((prev) => ({
      ...prev,
      photos: (prev.photos ?? []).filter((_, i) => i !== index),
    }))
  }

  const refreshQueuedCount = async () => {
    try {
      if (!db) return
      const c = await db.submissions.count()
      setQueuedCount(c)
    } catch {
      // ignore
    }
  }

  const saveDraftDebounced = (planId: string | null, nextHeader: AuditFormHeader, nextAnswers: AnswersState) => {
    if (!db) return
    if (draftSaveTimer.current) window.clearTimeout(draftSaveTimer.current)
    draftSaveTimer.current = window.setTimeout(async () => {
      try {
        const draftKey = makeDraftKey(planId, nextHeader)
        const answersLite = Object.values(nextAnswers).map((a) => ({
          questionId: a.questionId,
          rating: a.rating,
          explanation: a.explanation,
          findingType: a.findingType,
          actionToTake: a.actionToTake ?? null,
          dueDate: a.dueDate ?? '',
          locationName: a.locationName ?? '',
        }))
        await db.drafts.put({
          id: draftKey,
          updatedAt: Date.now(),
          planId,
          header: nextHeader,
          answers: answersLite as any,
        })
      } catch (e) {
        console.warn('draft save error', e)
      }
    }, 350)
  }

  const tryRestoreDraft = async (planId: string | null, h: AuditFormHeader) => {
    try {
      if (!db) return
      const draftKey = makeDraftKey(planId, h)
      const draft = await db.drafts.get(draftKey)
      if (!draft) return

      // header restore: sadece auditorName boşsa override etme gibi değil; draft gerçek state
      setHeader(draft.header)

      setAnswers((prev) => {
        const base = { ...prev }
        const arr = (draft.answers ?? []) as any[]
        for (const a of arr) {
          const qid = String(a.questionId)
          base[qid] = {
            questionId: qid,
            rating: a.rating ?? null,
            explanation: a.explanation ?? '',
            photos: prev[qid]?.photos ?? [],
            findingType: a.findingType ?? null,
            actionToTake: a.actionToTake ?? null,
            dueDate: a.dueDate ?? '',
            locationName: a.locationName ?? '',
          }
        }
        return base
      })
    } catch (e) {
      console.warn('draft restore error', e)
    }
  }

  const clearDraft = async (planId: string | null, h: AuditFormHeader) => {
    try {
      if (!db) return
      const draftKey = makeDraftKey(planId, h)
      await db.drafts.delete(draftKey)
    } catch {
      // ignore
    }
  }

  const enqueueSubmission = async (submission: OfflineAuditSubmission, photos: SubmissionPhotoRow[]) => {
    if (!db) return
    await db.transaction('rw', db.submissions, db.submissionPhotos, async () => {
      await db.submissions.put(submission)
      if (photos.length) await db.submissionPhotos.bulkPut(photos)
    })
    await refreshQueuedCount()
  }

  const syncOfflineQueue = async () => {
    if (!db) return
    if (syncing) return
    setSyncing(true)

    try {
      const A = actions as any
      const startAudit = A?.ADD_FIVE_S_AUDIT?.start
      const startFinding = A?.ADD_FIVE_S_FINDING?.start

      if (!startAudit || !startFinding) {
        console.warn('Sync: required actions not found')
        return
      }

      const all = await db.submissions.orderBy('createdAt').toArray()
      for (const s of all) {
        try {
          // 1) create audit
          const auditResp = await startAsPromise(startAudit, {
            payload: {
              department_name: s.auditPayload.department_name,
              auditor_name: s.auditPayload.auditor_name,
              audit_date: new Date(`${s.auditPayload.audit_date}T00:00:00`),
              total_score: s.auditPayload.total_score,
              target_score: s.auditPayload.target_score,
              score_s1: s.auditPayload.score_s1,
              score_s2: s.auditPayload.score_s2,
              score_s3: s.auditPayload.score_s3,
              score_s4: s.auditPayload.score_s4,
              score_s5: s.auditPayload.score_s5,
            },
          })

          const auditId = auditResp?.data?.id ?? auditResp?.id ?? auditResp?.data?.[0]?.id ?? null
          if (!auditId) throw new Error('Sync: auditId not returned')

          // 2) findings
          const photos = await db.submissionPhotos.where('submissionId').equals(s.id).toArray()
          const byQuestion = new Map<string, SubmissionPhotoRow[]>()
          for (const p of photos) {
            const key = String(p.questionId)
            const arr = byQuestion.get(key) ?? []
            arr.push(p)
            byQuestion.set(key, arr)
          }

          for (const f of s.findings) {
            const key = String(f.questionId)
            const relatedPhotos = byQuestion.get(key) ?? []

            // upload photos and build before files
            const uploaded: UploadedFileInfo[] = []
            for (const p of relatedPhotos) {
              const file = new File([p.blob], p.name, { type: p.type, lastModified: p.lastModified })
              try {
                const up = await uploadAnswerPhoto({ file })
                if (up?.fileId || up?.fileUrl) uploaded.push(up)
              } catch (err) {
                console.error('Sync upload error', err)
              }
            }

            const primary = uploaded[0]
            const beforeArr = toPhotoArr(uploaded)

            await startAsPromise(startFinding, {
              payload: {
                audit_id: auditId,
                client_finding_id: f.client_finding_id,
                detected_date: f.detected_date,
                location_name: f.location_name,
                finding_type: f.finding_type,
                description: f.description,
                action_to_take: f.action_to_take,
                due_date: f.due_date || undefined,
                responsible_name: f.responsible_name,
                responsible_user_id: f.responsible_user_id || undefined,
                auditor_name: f.auditor_name || s.auditPayload.auditor_name || undefined,

                photo_before_files: beforeArr,
                photo_before_file_id: primary?.fileId,
                photo_before_url: primary?.fileUrl,
              },
            })
          }

          // 3) cleanup submission
          await db.transaction('rw', db.submissions, db.submissionPhotos, async () => {
            await db.submissionPhotos.where('submissionId').equals(s.id).delete()
            await db.submissions.delete(s.id)
          })
          await refreshQueuedCount()
        } catch (err: any) {
          const msg = String(err?.message ?? err ?? 'sync error')
          console.error('Sync submission failed', s.id, msg)
          await db.submissions.update(s.id, { lastError: msg })
          // tek bir kayıt patladıysa diğerlerini denemeye devam edelim
        }
      }
    } finally {
      setSyncing(false)
    }
  }

  const fetchFindings = async (locationName: string) => {
    const loc = (locationName ?? '').trim()
    if (!loc) {
      setFindings([])
      return
    }

    try {
      setFindingsLoading(true)
      const A = actions as any
      const startFindings = safeStart(A, FINDINGS_KEYS.GET)

      const resp = startFindings
        ? await startAsPromise(startFindings, {
          payload: { page: 1, limit: 5000, orderBy: 'created_at', orderDirection: 'desc' },
        })
        : null

      const list = extractArray(resp) as FiveSFindingLite[]
      const filtered = (list ?? []).filter((f) => normLoc(String(f?.location_name ?? '')) === normLoc(loc))
      setFindings(filtered)
    } catch (e) {
      console.error('fetchFindings error', e)
      setFindings([])
    } finally {
      setFindingsLoading(false)
    }
  }

  const buildTeamMemberOptions = (
    teamId: string,
    members: TeamMemberRowLite[],
    teams: TeamRow[],
    usersById: Map<string, string>,
  ) => {
    const ids = new Set<string>()
    const team = teams.find((t) => t.id === teamId)
    if (team?.leader_user_id) ids.add(String(team.leader_user_id))
    for (const m of members) {
      if (!m?.is_active) continue
      if (String(m.team_id) !== String(teamId)) continue
      ids.add(String(m.user_id))
    }
    return Array.from(ids)
      .map((id) => ({ id, name: usersById.get(id) ?? '' }))
      .filter((x) => x.name)
  }

  const fetchAssignment = async () => {
    try {
      setAssignmentLoading(true)

      const A = actions as any
      const startMe = safeStart(A, ME_KEY)
      const startPlans = safeStart(A, PLAN_KEYS.GET)
      const startTeams = safeStart(A, TEAM_KEYS.GET)
      const startMembers = safeStart(A, TEAM_MEMBER_KEYS.GET)
      const startLocs = safeStart(A, LOC_KEYS.GET)
      const startUsers = safeStart(A, USERS_KEYS.GET)

      const startFindingTypes = safeStart(A, FINDING_TYPE_KEYS.GET)
      const startActionToTake = safeStart(A, ACTION_KEYS.GET)

      const meResp = startMe
        ? await startAsPromise(startMe, {
          disableAutoRedirect: true,
          payload: {},
        })
        : null

      const meData = meResp?.data ?? meResp?.response?.data ?? meResp
      const uidVal = String(meData?.sub ?? meData?.userId ?? meData?.id ?? '')
      setCurrentUserId(uidVal)

      const first = meData?.profile?.first_name ?? meData?.first_name ?? ''
      const last = meData?.profile?.last_name ?? meData?.last_name ?? ''
      const fullName = `${first} ${last}`.trim()
      const auditorFallback = fullName || meData?.name || meData?.email || ''

      const [plansResp, teamsResp, membersResp, locsResp, findingTypesResp, actionResp, usersResp] = await Promise.all([
        startPlans
          ? startAsPromise(startPlans, {
            payload: { page: 1, limit: 1000, orderBy: 'planned_date', orderDirection: 'desc' },
          })
          : Promise.resolve(null),

        startTeams
          ? startAsPromise(startTeams, {
            payload: { page: 1, limit: 2000, orderBy: 'created_at', orderDirection: 'desc' },
          })
          : Promise.resolve(null),

        startMembers
          ? startAsPromise(startMembers, {
            payload: { page: 1, limit: 5000, orderBy: 'created_at', orderDirection: 'desc' },
          })
          : Promise.resolve(null),

        startLocs
          ? startAsPromise(startLocs, {
            payload: { page: 1, limit: 2000, orderBy: 'created_at', orderDirection: 'desc' },
          })
          : Promise.resolve(null),

        startFindingTypes
          ? startAsPromise(startFindingTypes, {
            payload: { page: 1, limit: 2000, orderBy: 'created_at', orderDirection: 'desc' },
          })
          : Promise.resolve(null),

        startActionToTake
          ? startAsPromise(startActionToTake, {
            payload: { page: 1, limit: 2000, orderBy: 'created_at', orderDirection: 'desc' },
          })
          : Promise.resolve(null),

        startUsers
          ? startAsPromise(startUsers, { payload: { page: 1, limit: 500 } })
          : Promise.resolve(null),
      ])

      const plans = (extractArray(plansResp) as any[]).map((p) => ({
        ...p,
        planned_date: normalizeDateYYYYMMDD(p?.planned_date),
      })) as PlanRow[]

      const teams = extractArray(teamsResp) as TeamRow[]
      const members = extractArray(membersResp) as TeamMemberRowLite[]
      const locs = extractArray(locsResp) as LocationRow[]

      const ftList = extractArray(findingTypesResp) as MasterRow[]
      const actList = extractArray(actionResp) as MasterRow[]
      setFindingTypeOptions(toSelectOptions(ftList))
      setActionToTakeOptions(toSelectOptions(actList))

      const locNames = (locs ?? [])
        .filter((l) => l?.is_active)
        .map((l) => String(l.name ?? ''))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'tr'))
      setLocationNameOptions(locNames)

      // Madde 26: lokasyon → saha sorumlusu haritası (usersById aşağıda doluyor; buraya sonradan set ediyoruz)
      const pendingLocRespMap = new Map<string, { userId: string; userName: string }>()

      // Madde 18: kullanıcı isim haritası
      const usersById = new Map<string, string>()
      for (const u of extractArray(usersResp)) {
        const id = String(u?.id ?? '')
        const fn = u?.profile?.first_name ?? u?.first_name ?? ''
        const ln = u?.profile?.last_name ?? u?.last_name ?? ''
        const name = `${fn} ${ln}`.trim() || u?.name || u?.email || ''
        if (id && name) usersById.set(id, name)
      }
      // Mevcut kullanıcıyı da ekle (fallback)
      if (uidVal && auditorFallback) usersById.set(uidVal, auditorFallback)

      // Madde 26: lokasyon saha sorumlusu haritasını tamamla
      for (const l of locs) {
        if (!l?.is_active || !l?.name) continue
        const ids: string[] = Array.isArray((l as any).field_manager_user_ids)
          ? (l as any).field_manager_user_ids
          : []
        const firstId = ids[0] ?? ''
        const userName = firstId ? (usersById.get(firstId) ?? '') : ''
        if (firstId) {
          pendingLocRespMap.set(normLoc(l.name), { userId: firstId, userName })
        }
      }
      setLocationResponsibleMap(new Map(pendingLocRespMap))

      const memberSetByTeam = new Map<string, Set<string>>()
      for (const m of members) {
        if (!m?.is_active) continue
        if (!m?.team_id || !m?.user_id) continue
        const s = memberSetByTeam.get(m.team_id) ?? new Set<string>()
        s.add(String(m.user_id))
        memberSetByTeam.set(m.team_id, s)
      }

      for (const t of teams) {
        if (!t?.id) continue
        const s = memberSetByTeam.get(t.id) ?? new Set<string>()
        if (t.leader_user_id) s.add(String(t.leader_user_id))
        memberSetByTeam.set(t.id, s)
      }

      const activePlans = plans.filter((p) => p?.is_active && p?.status === 'planned' && !p?.audit_id)
      const matched = activePlans.filter((p) => {
        const s = memberSetByTeam.get(p.assigned_team_id)
        return !!s && !!uidVal && s.has(String(uidVal))
      })

      if (matched.length === 0) {
        setAssignedPlan(null)
        setHeader((prev) => ({
          ...prev,
          auditorName: prev.auditorName || auditorFallback,
        }))
        return
      }

      // Madde 17: plan meta haritası (lokasyon + ekip adı)
      const metaMap: Record<string, { locationName: string; teamName: string }> = {}
      for (const p of matched) {
        metaMap[p.id] = {
          locationName: locs.find((l) => l.id === p.location_id)?.name ?? '',
          teamName: teams.find((t) => t.id === p.assigned_team_id)?.name ?? '',
        }
      }
      setPlanMetaMap(metaMap)

      // Madde 17: Birden fazla plan varsa seçim moduna geç
      if (matched.length > 1) {
        setAvailablePlans(matched)
        setPlanSelectionMode(true)
        setHeader((prev) => ({ ...prev, auditorName: prev.auditorName || auditorFallback }))
        return
      }

      const chosen = matched[0]!
      setAssignedPlan(chosen)

      const teamName = metaMap[chosen.id]?.teamName ?? ''
      const locName = metaMap[chosen.id]?.locationName ?? ''

      // Madde 18: seçili ekibin üyelerini doldur
      const memberOpts = buildTeamMemberOptions(chosen.assigned_team_id, members, teams, usersById)
      setTeamMemberOptions(memberOpts)

      const nextHeader = {
        teamName,
        department: locName,
        date: chosen.planned_date || header.date,
        auditorName: header.auditorName || auditorFallback,
      } satisfies AuditFormHeader

      setHeader(nextHeader)

      // ✅ draft restore (plan-based)
      await tryRestoreDraft(chosen.id, nextHeader)
    } catch (e) {
      console.error('fetchAssignment error', e)
      setAssignedPlan(null)
    } finally {
      setAssignmentLoading(false)
    }
  }

  // Madde 17: Kullanıcı bir plan seçince çağrılır
  const selectPlan = async (plan: PlanRow) => {
    setPlanSelectionMode(false)
    setAssignedPlan(plan)

    const meta = planMetaMap[plan.id] ?? { teamName: '', locationName: '' }
    const nextHeader: AuditFormHeader = {
      teamName: meta.teamName,
      department: meta.locationName,
      date: plan.planned_date || header.date,
      auditorName: header.auditorName,
    }
    setHeader(nextHeader)
    await tryRestoreDraft(plan.id, nextHeader)
  }

  // BE'den sorular ve adımları çek; DB boşsa fallback constants
  const fetchQuestionsFromBE = React.useCallback(async () => {
    const A = actions as any
    const stepsStart = A?.[STEP_KEYS.GET]?.start
    const qStart = A?.[QUESTION_KEYS.GET]?.start
    if (!stepsStart || !qStart) return

    try {
      const [stepsRes, qRes] = await Promise.all([
        new Promise<any>((resolve) =>
          stepsStart({ payload: { page: 1, limit: 100, orderBy: 'order', orderDirection: 'asc' }, onAfterHandle: resolve, onErrorHandle: () => resolve(null) })
        ),
        new Promise<any>((resolve) =>
          qStart({ payload: { page: 1, limit: 500, orderBy: 'external_id', orderDirection: 'asc' }, onAfterHandle: resolve, onErrorHandle: () => resolve(null) })
        ),
      ])

      const extract = (res: any): any[] => {
        const cands = [res?.data?.data, res?.data, res]
        for (const c of cands) {
          if (Array.isArray(c)) return c
          if (Array.isArray(c?.data)) return c.data
        }
        return []
      }

      const rawSteps = extract(stepsRes)
      const rawQ = extract(qRes)

      if (rawSteps.length > 0) {
        setSteps(
          rawSteps.map((s: any) => ({
            code: String(s.code ?? '') as StepCode,
            title: String(s.title ?? ''),
            maxScore: parseFloat(String(s.max_score ?? '0')),
            order: Number(s.order ?? 0),
          }))
        )
      }

      if (rawQ.length > 0) {
        const mapped: Question[] = rawQ.map((q: any) => ({
          id: String(q.external_id ?? q.id ?? ''),
          stepCode: String(q.external_id ?? '').split('-')[0] as StepCode,
          order: Number(q.order ?? 0),
          text: String(q.text ?? ''),
          maxScore: parseFloat(String(q.max_score ?? '0')),
          requireExplanation: Boolean(q.require_explanation ?? true),
        }))
        setQuestions(mapped)
        // answers state'ini yeni soru listesiyle senkronize et (eksik olanları ekle)
        setAnswers((prev) => {
          const next = { ...prev }
          for (const q of mapped) {
            if (!next[q.id]) {
              next[q.id] = {
                questionId: q.id,
                rating: null,
                explanation: '',
                photos: [],
                findingType: null,
                actionToTake: null,
                dueDate: '',
                locationName: '',
              }
            }
          }
          return next
        })
      }
    } catch (err) {
      console.error('fetchQuestionsFromBE error', err)
    }
  }, [actions])

  // Online/offline tracking
  useEffect(() => {
    const onOn = () => setIsOnline(true)
    const onOff = () => setIsOnline(false)
    window.addEventListener('online', onOn)
    window.addEventListener('offline', onOff)
    return () => {
      window.removeEventListener('online', onOn)
      window.removeEventListener('offline', onOff)
    }
  }, [])

  useEffect(() => {
    fetchAssignment()
    fetchQuestionsFromBE()
    refreshQueuedCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // plan geldikten sonra bulgular
  useEffect(() => {
    if (assignmentLoading) return
    if (!header.department?.trim()) return
    fetchFindings(header.department)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentLoading, header.department])

  // Draft autosave (header/answers değiştikçe)
  useEffect(() => {
    if (assignmentLoading) return
    const planId = assignedPlan?.id ?? null
    saveDraftDebounced(planId, header, answers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header, answers, assignedPlan?.id, assignmentLoading])

  // Online olunca otomatik sync dene
  useEffect(() => {
    if (!isOnline) return
    if (queuedCount <= 0) return
    syncOfflineQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, queuedCount])

  const activeQuestion = useMemo(
    () => (activeDetailQuestionId ? questions.find((q) => q.id === activeDetailQuestionId) ?? null : null),
    [activeDetailQuestionId, questions]
  )
  const activeAnswer = activeDetailQuestionId ? answers[activeDetailQuestionId] : undefined

  const LocationsDatalist = (
    <datalist id="five-s-location-options">
      {locationNameOptions.map((name) => (
        <option key={name} value={name} />
      ))}
    </datalist>
  )

  const FindingsPanel = (
    <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">Bu Lokasyondaki Bulgular</div>
          <div className="mt-1 text-[11px] text-slate-400">
            Lokasyon: <span className="text-slate-200">{header.department || '-'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queuedCount > 0 ? (
            <button
              type="button"
              onClick={syncOfflineQueue}
              disabled={!isOnline || syncing}
              className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] hover:bg-slate-950 disabled:opacity-50"
              title={!isOnline ? 'Offline iken senkron yapılamaz' : 'Kuyruğu senkronla'}
            >
              {syncing ? 'Senkron...' : `Senkronla (${queuedCount})`}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => fetchFindings(header.department)}
            className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] hover:bg-slate-950"
          >
            Yenile
          </button>

        </div>
      </div>

      {findingsLoading ? (
        <div className="mt-3 text-xs text-slate-400">Bulgular yükleniyor...</div>
      ) : findings.length === 0 ? (
        <div className="mt-3 text-xs text-slate-400">Bu lokasyonda kayıtlı bulgu bulunamadı.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">No</th>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Bulgu Tipi</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">Termin</th>
                <th className="px-3 py-2">Sorumlu</th>
                <th className="px-3 py-2">Detay</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f, idx) => (
                <tr key={f.id} className="border-t border-slate-800/80">
                  <td className="px-3 py-2 text-[11px] text-slate-400">{f.finding_no ?? idx + 1}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-300">{String(f.detected_date ?? '-')}</td>
                  <td className="px-3 py-2">{String(f.finding_type ?? '-')}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-300">{String(f.status ?? '-')}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-300">{String(f.due_date ?? '-')}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-300">{String(f.responsible_name ?? '-')}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setActiveFinding(f)}
                      className="inline-flex items-center rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1 text-[11px] hover:bg-slate-800"
                    >
                      Gör
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  const buildFindingDescriptionFromAnswer = (ans: QuestionAnswer, q: Question, teamName: string) => {
    const descriptionLines: string[] = [
      `Soru ID: ${q.id}`,
      `Adım: ${q.stepCode}`,
      `Soru: ${q.text}`,
      `Değerlendirme: ${ans.rating}`,
      `Ekip: ${teamName}`,
    ]
    if (ans.explanation?.trim()) descriptionLines.push(`Açıklama: ${ans.explanation.trim()}`)
    if (ans.actionToTake?.trim()) descriptionLines.push(`Alınacak Faaliyet: ${ans.actionToTake.trim()}`)
    return descriptionLines.join('\n')
  }

  const enqueueAuditAndFindingsFromForm = async () => {
    const { S1, S2, S3, S4, S5 } = stepScores

    const submissionId = makeUid('sub')
    const planId = assignedPlan?.id ?? null

    const auditPayload = {
      department_name: header.department.trim(),
      auditor_name: header.auditorName.trim(),
      audit_date: header.date,
      total_score: totalScore.toFixed(2),
      target_score: TARGET_SCORE.toFixed(2),
      score_s1: (S1 ?? 0).toFixed(2),
      score_s2: (S2 ?? 0).toFixed(2),
      score_s3: (S3 ?? 0).toFixed(2),
      score_s4: (S4 ?? 0).toFixed(2),
      score_s5: (S5 ?? 0).toFixed(2),
    }

    const nonGoodAnswers = Object.values(answers).filter((ans) => ans.rating && ans.rating !== 'good')
    const detectedDate = header.date

    const findingsPayload: OfflineFindingPayload[] = []
    const photoRows: SubmissionPhotoRow[] = []

    for (const ans of nonGoodAnswers) {
      const q = questions.find((qq) => qq.id === ans.questionId)
      if (!q) continue
      if (!ans.findingType) continue

      const effectiveLocationName = ans.locationName?.trim() || header.department.trim() || 'Bilinmeyen Lokasyon'
      const description = buildFindingDescriptionFromAnswer(ans, q, header.teamName)

      const locKey = normLoc(effectiveLocationName)
      const responsible = locationResponsibleMap.get(locKey) ?? null

      findingsPayload.push({
        questionId: ans.questionId,
        client_finding_id: makeUid('fid'),
        detected_date: detectedDate,
        location_name: effectiveLocationName,
        finding_type: ans.findingType,
        description,
        action_to_take: (ans.actionToTake ?? '').trim(),
        due_date: ans.dueDate || undefined,
        responsible_name: responsible?.userName || header.auditorName,
        responsible_user_id: responsible?.userId || null,
        auditor_name: header.auditorName.trim(),
      })

      for (const f of ans.photos ?? []) {
        photoRows.push({
          id: makeUid('p'),
          submissionId,
          questionId: ans.questionId,
          name: f.name,
          type: f.type,
          size: f.size,
          lastModified: f.lastModified,
          blob: f,
        })
      }
    }

    const submission: OfflineAuditSubmission = {
      id: submissionId,
      createdAt: Date.now(),
      planId,
      header,
      auditPayload,
      findings: findingsPayload,
      lastError: null,
    }

    await enqueueSubmission(submission, photoRows)
    await clearDraft(planId, header)

    setSubmitted(true)
    alert('İnternet yok veya kayıt hatası oluştu. Form offline kuyruğa eklendi. İnternet gelince otomatik senkronlanır.')
  }

  const markPlanCompleted = async (planId: string, auditId: string) => {
    try {
      const A = actions as any
      const startUpdate = safeStart(A, planUpdateKey)
      if (!startUpdate) return
      await startAsPromise(startUpdate, {
        disableAutoRedirect: true,
        payload: { _id: planId, status: 'completed', audit_id: auditId },
      })
    } catch (err) {
      console.warn('Plan completed işaretlenemedi (kritik değil):', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setHasAttempted(true)

    const missing = new Set<string>()

    if (!header.teamName || !header.department || !header.date) {
      alert('Ekip, Lokasyon ve Tarih alanları plan üzerinden otomatik gelmelidir.')
      return
    }
    if (!header.auditorName) {
      alert('Denetimi Yapan alanı zorunludur.')
      return
    }

    for (const q of questions) {
      const ans = answers[q.id]
      if (!ans || !ans.rating) {
        missing.add(q.id)
        continue
      }

      if (isExplanationRequired(q, ans) && !ans.explanation.trim()) missing.add(q.id)

      if (ans.rating !== 'good') {
        if (!ans.findingType) missing.add(q.id)
        if (!ans.actionToTake?.trim()) missing.add(q.id)
        if (!ans.dueDate) missing.add(q.id)
        const loc = (ans.locationName?.trim() || header.department || '').trim()
        if (!loc) missing.add(q.id)
      }
    }

    if (missing.size > 0) {
      setMissingQuestions(new Set(missing))
      return
    }

    setMissingQuestions(new Set())

    // offline ise direkt queue
    if (!isOnline) {
      await enqueueAuditAndFindingsFromForm()
      return
    }

    const { S1, S2, S3, S4, S5 } = stepScores

    try {
      await startAsPromise((actions as any).ADD_FIVE_S_AUDIT?.start, {
        disableAutoRedirect: true,
        payload: {
          department_name: header.department.trim(),
          auditor_name: header.auditorName.trim(),
          audit_date: new Date(header.date),

          total_score: totalScore.toFixed(2),
          target_score: TARGET_SCORE.toFixed(2),

          score_s1: (S1 ?? 0).toFixed(2),
          score_s2: (S2 ?? 0).toFixed(2),
          score_s3: (S3 ?? 0).toFixed(2),
          score_s4: (S4 ?? 0).toFixed(2),
          score_s5: (S5 ?? 0).toFixed(2),
        },

        onAfterHandle: async (data: any) => {
          const auditId = data?.data?.id ?? data?.id ?? data?.data?.[0]?.id ?? null

          if (!auditId) {
            console.warn('Audit ID bulunamadı, findings kaydı atlanıyor.')
            setSubmitted(true)
            return
          }

          const nonGoodAnswers = Object.values(answers).filter((ans) => ans.rating && ans.rating !== 'good')
          if (nonGoodAnswers.length === 0) {
            setSubmitted(true)
            await clearDraft(assignedPlan?.id ?? null, header)
            return
          }

          const nonGoodWithType = nonGoodAnswers.filter((ans) => !!ans.findingType)
          const detectedDate = header.date

          const jobs = nonGoodWithType.map(async (ans) => {
            const q = questions.find((qq) => qq.id === ans.questionId)
            if (!q) return

            const description = buildFindingDescriptionFromAnswer(ans, q, header.teamName)
            const effectiveLocationName =
              ans.locationName?.trim() || header.department.trim() || 'Bilinmeyen Lokasyon'

            const locKey2 = normLoc(effectiveLocationName)
            const responsible2 = locationResponsibleMap.get(locKey2) ?? null

            const uploadedPhotos: UploadedFileInfo[] = []
            for (const f of ans.photos ?? []) {
              try {
                const up = await uploadAnswerPhoto({ file: f })
                if (up?.fileId || up?.fileUrl) uploadedPhotos.push(up)
              } catch (err) {
                console.error('Fotoğraf upload error', err)
              }
            }

            const primary = uploadedPhotos[0]
            const beforeArr = toPhotoArr(uploadedPhotos)

            try {
              await startAsPromise((actions as any).ADD_FIVE_S_FINDING?.start, {
                disableAutoRedirect: true,
                payload: {
                  audit_id: auditId,
                  client_finding_id: crypto.randomUUID(),
                  detected_date: detectedDate,
                  location_name: effectiveLocationName,
                  finding_type: ans.findingType!,
                  description,
                  action_to_take: ans.actionToTake?.trim(),
                  due_date: ans.dueDate || undefined,
                  responsible_name: responsible2?.userName || header.auditorName,
                  responsible_user_id: responsible2?.userId || undefined,
                  auditor_name: header.auditorName.trim(),

                  photo_before_files: beforeArr,
                  photo_before_file_id: primary?.fileId,
                  photo_before_url: primary?.fileUrl,
                },
              })
            } catch (err) {
              console.error('ADD_FIVE_S_FINDING error', err)
            }
          })

          await Promise.all(jobs)
          setSubmitted(true)
          await clearDraft(assignedPlan?.id ?? null, header)

          // Madde 25: planı "completed" olarak işaretle
          if (assignedPlan?.id && auditId) {
            await markPlanCompleted(assignedPlan.id, auditId)
          }

          fetchFindings(header.department)
          console.log('Audit + findings (+ photos) başarıyla kaydedildi.')
        },
      })
    } catch (err) {
      console.error('ADD_FIVE_S_AUDIT failed -> offline queue', err)
      await enqueueAuditAndFindingsFromForm()
    }
  }

  const handleReset = async () => {
    setSubmitted(false)
    setAnswers(() =>
      Object.fromEntries(
        questions.map((q) => [
          q.id,
          {
            questionId: q.id,
            rating: null,
            explanation: '',
            photos: [],
            findingType: null,
            actionToTake: null,
            dueDate: '',
            locationName: '',
          },
        ])
      )
    )
    setExpanded({})
    await clearDraft(assignedPlan?.id ?? null, header)
  }

  const handleSingleFindingSave = async () => {
    const isNoPlanFlow = !assignedPlan

    if (isNoPlanFlow && !canCreateSingleFinding) {
      alert('Tekil bulgu girişi için yetkiniz yok.')
      return
    }

    if (!isNoPlanFlow) {
      if (!header.teamName || !header.department || !header.date) {
        alert('Tekil bulgu kaydı için ekibinize planlanan bir denetim olmalıdır.')
        return
      }
    }

    if (isNoPlanFlow) {
      if (!header.department?.trim()) return alert('Lokasyon alanı zorunludur.')
      if (!header.date) return alert('Tarih alanı zorunludur.')
      if (!header.teamName) setHeader((prev) => ({ ...prev, teamName: 'Content Manager Core Team' }))
    }

    if (!header.auditorName) return alert('Tekil bulgu kaydı için Denetimi Yapan zorunludur.')
    if (!singleFinding.findingType) return alert('Bulgu tipi zorunludur.')
    if (!singleFinding.explanation.trim()) return alert('Açıklama zorunludur.')
    if (!singleFinding.actionToTake.trim()) return alert('Alınacak faaliyet alanı zorunludur.')
    if (!singleFinding.dueDate) return alert('Termin tarihi zorunludur.')

    const loc = (header.department || '').trim()
    if (!loc) return alert('Lokasyon alanı zorunludur.')

    // offline ise: audit + single finding kuyruğa
    if (!isOnline) {
      const submissionId = makeUid('sub')
      const planId = assignedPlan?.id ?? null

      const submission: OfflineAuditSubmission = {
        id: submissionId,
        createdAt: Date.now(),
        planId,
        header,
        auditPayload: {
          department_name: header.department.trim(),
          auditor_name: header.auditorName.trim(),
          audit_date: header.date,
          total_score: '0.00',
          target_score: TARGET_SCORE.toFixed(2),
          score_s1: '0.00',
          score_s2: '0.00',
          score_s3: '0.00',
          score_s4: '0.00',
          score_s5: '0.00',
        },
        findings: [
          {
            questionId: 'SINGLE',
            client_finding_id: makeUid('fid'),
            detected_date: header.date,
            location_name: loc || 'Bilinmeyen Lokasyon',
            finding_type: singleFinding.findingType,
            description: [
              'TEKİL BULGU',
              `Ekip: ${header.teamName || 'Content Manager Core Team'}`,
              singleFinding.linkedQuestionId ? `Bağlı Soru: ${singleFinding.linkedQuestionId}` : null,
              `Bulgu Tipi: ${singleFinding.findingType}`,
              `Açıklama: ${singleFinding.explanation.trim()}`,
              `Alınacak Faaliyet: ${singleFinding.actionToTake.trim()}`,
            ].filter(Boolean).join('\n'),
            responsible_name: locationResponsibleMap.get(normLoc(loc))?.userName || header.auditorName,
            responsible_user_id: locationResponsibleMap.get(normLoc(loc))?.userId || null,
            action_to_take: singleFinding.actionToTake.trim(),
            due_date: singleFinding.dueDate || undefined,
          },
        ],
        lastError: null,
      }

      const photoRows: SubmissionPhotoRow[] = []
      for (const f of singleFinding.photos ?? []) {
        photoRows.push({
          id: makeUid('p'),
          submissionId,
          questionId: 'SINGLE',
          name: f.name,
          type: f.type,
          size: f.size,
          lastModified: f.lastModified,
          blob: f,
        })
      }

      await enqueueSubmission(submission, photoRows)

      alert('Offline: Tekil bulgu kuyruğa eklendi. İnternet gelince otomatik gönderilecek.')
      setSingleFindingOpen(false)
      setSingleFinding({ findingType: '', explanation: '', photos: [], actionToTake: '', dueDate: '', linkedQuestionId: '' })
      return
    }

    // online: mevcut akış
    try {
      await startAsPromise((actions as any).ADD_FIVE_S_AUDIT?.start, {
        disableAutoRedirect: true,
        payload: {
          department_name: header.department.trim(),
          auditor_name: header.auditorName.trim(),
          audit_date: new Date(header.date),

          total_score: '0.00',
          target_score: TARGET_SCORE.toFixed(2),

          score_s1: '0.00',
          score_s2: '0.00',
          score_s3: '0.00',
          score_s4: '0.00',
          score_s5: '0.00',
        },

        onAfterHandle: async (data: any) => {
          const auditId = data?.data?.id ?? data?.id ?? data?.data?.[0]?.id ?? null
          if (!auditId) return alert('Tekil bulgu için audit kaydı oluşturulamadı.')

          const uploadedPhotos: UploadedFileInfo[] = []
          for (const f of singleFinding.photos ?? []) {
            try {
              const up = await uploadAnswerPhoto({ file: f })
              if (up?.fileId || up?.fileUrl) uploadedPhotos.push(up)
            } catch (err) {
              console.error('Tekil bulgu fotoğraf upload error', err)
            }
          }

          const primary = uploadedPhotos[0]
          const beforeArr = toPhotoArr(uploadedPhotos)

          const descriptionLines: string[] = [
            'TEKİL BULGU',
            `Ekip: ${header.teamName || 'Content Manager Core Team'}`,
            ...(singleFinding.linkedQuestionId
              ? [
                  `Bağlı Soru: ${singleFinding.linkedQuestionId}`,
                  `Soru Metni: ${questions.find((q) => q.id === singleFinding.linkedQuestionId)?.text ?? ''}`,
                ]
              : []),
            `Bulgu Tipi: ${singleFinding.findingType}`,
            `Açıklama: ${singleFinding.explanation.trim()}`,
            `Alınacak Faaliyet: ${singleFinding.actionToTake.trim()}`,
          ]
          const description = descriptionLines.join('\n')

          const singleLocResp = locationResponsibleMap.get(normLoc(loc || '')) ?? null

          try {
            await startAsPromise((actions as any).ADD_FIVE_S_FINDING?.start, {
              disableAutoRedirect: true,
              payload: {
                audit_id: auditId,
                client_finding_id: crypto.randomUUID(),
                detected_date: header.date,
                location_name: loc || 'Bilinmeyen Lokasyon',
                finding_type: singleFinding.findingType,
                description,
                responsible_name: singleLocResp?.userName || header.auditorName,
                responsible_user_id: singleLocResp?.userId || undefined,
                action_to_take: singleFinding.actionToTake.trim(),
                due_date: singleFinding.dueDate || undefined,
                auditor_name: header.auditorName.trim(),

                photo_before_files: beforeArr,
                photo_before_file_id: primary?.fileId,
                photo_before_url: primary?.fileUrl,
              },
            })

            alert('Tekil bulgu başarıyla kaydedildi.')
            setSingleFindingOpen(false)
            setSingleFinding({ findingType: '', explanation: '', photos: [], actionToTake: '', dueDate: '', linkedQuestionId: '' })
            fetchFindings(header.department)
          } catch (err) {
            console.error('TEKİL BULGU ADD_FIVE_S_FINDING error', err)
            alert('Tekil bulgu kaydedilirken bir hata oluştu.')
          }
        },
      })
    } catch (err) {
      console.error('TEKİL BULGU audit error -> offline queue', err)
      alert('Kayıt sırasında hata oluştu. İnternet sorunu olabilir. Tekrar deneyin veya offline kuyruğa ekleyin.')
    }
  }

  /* ───────────────────────────── Render ───────────────────────────── */
  if (assignmentLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Planlanan denetimler kontrol ediliyor...
        </div>
      </div>
    )
  }

  // Madde 17: Çoklu plan seçim ekranı
  if (planSelectionMode && availablePlans.length > 1) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10 md:px-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-base font-semibold text-slate-100">Denetim Seç</h2>
          <p className="mt-1 text-sm text-slate-400">
            Ekibinize atanmış birden fazla planlı denetim var. Lütfen hangi denetimi yapacağınızı seçin.
          </p>

          <div className="mt-5 space-y-3">
            {availablePlans.map((p) => {
              const meta = planMetaMap[p.id] ?? { locationName: '-', teamName: '-' }
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPlan(p)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-left hover:border-sky-500/60 hover:bg-sky-500/5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{meta.locationName || 'Bilinmeyen Lokasyon'}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        Ekip: <span className="text-slate-300">{meta.teamName || '-'}</span>
                        {' · '}
                        Tarih: <span className="text-slate-300">{p.planned_date || '-'}</span>
                      </div>
                    </div>
                    <span className="text-xs text-sky-400">Seç →</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // No plan flow (tekil bulgu + bulgu paneli)
  if (!assignedPlan) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10 md:px-8">
        {LocationsDatalist}

        <div className="mx-auto max-w-3xl rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-slate-100">Ekibinize planlanan bir denetim yoktur</div>
              <div className="mt-2 text-sm text-slate-400">
                Planlama ekranından ekibinize bir denetim planlandığında bu form otomatik açılacaktır.
              </div>

              <div className="mt-2 text-[11px] text-slate-400">
                Durum:{' '}
                <span className={isOnline ? 'text-emerald-300' : 'text-amber-300'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {queuedCount > 0 ? (
                  <span className="ml-2 text-slate-500">• Kuyruk: {queuedCount}</span>
                ) : null}
              </div>
            </div>

            {queuedCount > 0 ? (
              <button
                type="button"
                onClick={syncOfflineQueue}
                disabled={!isOnline || syncing}
                className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] hover:bg-slate-950 disabled:opacity-50"
              >
                {syncing ? 'Senkron...' : `Senkronla (${queuedCount})`}
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={fetchAssignment}
              className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs hover:bg-slate-950"
            >
              Tekrar Kontrol Et
            </button>

            {canCreateSingleFinding ? (
              <button
                type="button"
                onClick={openSingleFindingModal}
                className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Tekil Bulgu +
              </button>
            ) : null}
          </div>

          {header.department?.trim() ? FindingsPanel : null}
        </div>

        {/* Tekil Bulgu Modal */}
        {singleFindingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Tekil Bulgu Girişi</h3>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {assignedPlan
                      ? 'Denetim sırasında ek tekil bulgu kaydedebilirsiniz. Bir soruya bağlamak opsiyoneldir.'
                      : 'Denetim planı olmasa bile (sadece yetkili rol) tekil bir 5S bulgusunu burada kaydedebilirsiniz.'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Durum:{' '}
                    <span className={isOnline ? 'text-emerald-300' : 'text-amber-300'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                    {queuedCount > 0 ? <span className="ml-2">• Kuyruk: {queuedCount}</span> : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeSingleFindingModal}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Denetimi Yapan <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <input
                    type="text"
                    value={header.auditorName}
                    onChange={(e) => handleHeaderChange('auditorName', e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    placeholder="İsim Soyisim"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">Ekip</label>
                  <input
                    type="text"
                    value={header.teamName || 'Content Manager Core Team'}
                    readOnly
                    className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1.5 text-xs text-slate-200 opacity-90"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-medium text-slate-300">
                      Lokasyon <span className="text-rose-400">(zorunlu)</span>
                    </label>

                    <select
                      value={header.department}
                      onChange={(e) => handleHeaderChange('department', e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    >
                      <option value="">Seçiniz</option>
                      {locationNameOptions.length === 0 ? (
                        <option value="" disabled>
                          Yükleniyor...
                        </option>
                      ) : (
                        locationNameOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-slate-300">
                      Tarih <span className="text-rose-400">(zorunlu)</span>
                    </label>
                    <DateInput
                   
                      value={header.date}
                      onChange={(value) => handleHeaderChange('date',  value)}
                      className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
/>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Bulgu Tipi <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <select
                    value={singleFinding.findingType}
                    onChange={(e) => handleSingleFindingFieldChange('findingType', e.target.value as FindingType | '')}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  >
                    <option value="">Seçiniz</option>
                    {findingTypeOptions.length === 0 ? (
                      <option value="" disabled>
                        Yükleniyor...
                      </option>
                    ) : (
                      findingTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Bağlı Soru <span className="text-slate-500">(opsiyonel)</span>
                  </label>
                  <select
                    value={singleFinding.linkedQuestionId}
                    onChange={(e) => handleSingleFindingFieldChange('linkedQuestionId', e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  >
                    <option value="">Seçiniz (bağlamak istemiyorsanız boş bırakın)</option>
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.id} — {q.text.length > 80 ? q.text.slice(0, 80) + '…' : q.text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Açıklama <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={singleFinding.explanation}
                    onChange={(e) => handleSingleFindingFieldChange('explanation', e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    placeholder="Kısa açıklama girin..."
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">Fotoğraflar</label>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-md border border-slate-600 bg-slate-950/70 px-3 py-1.5 text-[11px] hover:bg-slate-800">
                      Fotoğraf(lar) Ekle
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handleSingleFindingPhotosAdd(e.target.files)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>

                  {(singleFinding.photos?.length ?? 0) > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {singleFinding.photos.map((f, i) => (
                        <li
                          key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1"
                        >
                          <span className="truncate text-[11px] text-slate-300">
                            {i + 1}. {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSingleFindingPhotoRemove(i)}
                            className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                          >
                            Sil
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500">Henüz fotoğraf eklenmedi.</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Alınacak Faaliyet <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <select
                    value={singleFinding.actionToTake}
                    onChange={(e) =>
                      handleSingleFindingFieldChange('actionToTake', e.target.value as ActionToTake | '')
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  >
                    <option value="">Seçiniz</option>
                    {actionToTakeOptions.length === 0 ? (
                      <option value="" disabled>
                        Yükleniyor...
                      </option>
                    ) : (
                      actionToTakeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Termin Tarihi <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <DateInput
                    value={singleFinding.dueDate || header.date}
                    onChange={(value) => handleSingleFindingFieldChange('dueDate',  value)}
                    className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
/>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={closeSingleFindingModal}
                  className="rounded-md border border-slate-600 px-4 py-1.5 text-slate-200 hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="button"
                   disabled={(singleFinding.photos?.length ?? 0) === 0}
                  onClick={handleSingleFindingSave}
                  className="rounded-md bg-emerald-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulgu Detay Modal */}
        {activeFinding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Bulgu Detayı</h3>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {String(activeFinding.finding_type ?? '-')} • {String(activeFinding.detected_date ?? '-')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFinding(null)}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-200">
                <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3 whitespace-pre-wrap">
                  {activeFinding.description || '-'}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-500">Termin:</span> {String(activeFinding.due_date ?? '-')}
                  </div>
                  <div>
                    <span className="text-slate-500">Sorumlu:</span> {String(activeFinding.responsible_name ?? '-')}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Lokasyon:</span> {String(activeFinding.location_name ?? '-')}
                  </div>
                </div>

                {getBeforePhotoResolvedUrls(activeFinding).length > 0 ? (
                  <div className="rounded-md border border-slate-800 bg-slate-950/30 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-200">Öncesi Fotoğraflar</div>
                    <div className="grid grid-cols-3 gap-2">
                      {getBeforePhotoResolvedUrls(activeFinding).map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          onClick={() => setPreviewUrl(url)}
                          className="group relative overflow-hidden rounded-md border border-slate-800 bg-slate-950/40 hover:border-slate-600"
                          title="Büyüt"
                        >
                          <img
                            src={url}
                            alt={`before-${idx + 1}`}
                            className="h-20 w-full object-cover transition-transform group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-slate-100">
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400">Fotoğrafa tıklayınca büyür.</div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">Öncesi fotoğraf yok.</div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveFinding(null)}
                  className="rounded-md border border-slate-600 px-4 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {previewUrl && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="relative w-full max-w-4xl">
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="absolute -top-10 right-0 rounded-md border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-900"
              >
                ✕ Kapat
              </button>

              <img
                src={previewUrl}
                alt="preview"
                className="max-h-[80vh] w-full rounded-xl border border-slate-700 object-contain bg-slate-950"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Assigned plan flow (full audit form)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8">
      {LocationsDatalist}

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="border-b border-slate-800 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold md:text-2xl">5S Denetim Formu (Sahalar)</h1>
              <p className="mt-1 text-sm text-slate-400">
                Minimum hedef puan: <span className="font-semibold text-emerald-300">75</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Plan: <span className="text-slate-300">{header.teamName}</span> •{' '}
                <span className="text-slate-300">{header.department}</span> •{' '}
                <span className="text-slate-300">{header.date}</span>
              </p>
              <p className="mt-2 text-[11px] text-slate-400">
                Durum:{' '}
                <span className={isOnline ? 'text-emerald-300' : 'text-amber-300'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {queuedCount > 0 ? <span className="ml-2 text-slate-500">• Kuyruk: {queuedCount}</span> : null}
                {queuedCount > 0 ? (
                  <button
                    type="button"
                    onClick={syncOfflineQueue}
                    disabled={!isOnline || syncing}
                    className="ml-3 inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[10px] hover:bg-slate-950 disabled:opacity-50"
                  >
                    {syncing ? 'Senkron...' : 'Senkronla'}
                  </button>
                ) : null}
              </p>
            </div>

            <div className="flex flex-col gap-2 items-stretch md:items-end">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex flex-col items-start gap-1 rounded-xl bg-slate-900/70 px-4 py-3 text-sm sm:items-end">
                  <span className="text-slate-400">Toplam Puan</span>
                  <span className={`text-2xl font-bold ${totalScore >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {formatScore(totalScore)} / 100
                  </span>
                  <span className="text-xs text-slate-500">{totalScore >= 75 ? 'Hedef üstü' : 'Hedef altında'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {FindingsPanel}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-slate-900/60 p-4 shadow-xl shadow-slate-950/60 md:p-6"
        >
          {/* Genel Bilgiler */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <h2 className="text-sm font-semibold text-slate-200">Genel Bilgiler</h2>
              <p className="mt-1 text-xs text-slate-400">Ekip, lokasyon ve tarih plan üzerinden otomatik gelir.</p>
            </div>

            <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Ekip</label>
                <input
                  type="text"
                  value={header.teamName}
                  readOnly
                  className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 opacity-90"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Lokasyon</label>
                <input
                  type="text"
                  value={header.department}
                  readOnly
                  className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 opacity-90"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Denetimi Yapan</label>
                {teamMemberOptions.length > 0 ? (
                  <select
                    value={header.auditorName}
                    onChange={(e) => handleHeaderChange('auditorName', e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  >
                    <option value="">Seçiniz</option>
                    {teamMemberOptions.map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={header.auditorName}
                    onChange={(e) => handleHeaderChange('auditorName', e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    placeholder="İsim Soyisim"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Tarih</label>
                <input
                  type="date"
                  value={header.date}
                  readOnly
                  className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 opacity-90"
                />
              </div>
            </div>
          </section>

          {/* Adımlar & Sorular */}
          {steps.map((step) => {
            const stepQuestions = questions.filter((q) => q.stepCode === step.code).sort((a, b) => a.order - b.order)

            const stepScore = stepScores[step.code]
            const stepRatio = step.maxScore > 0 ? stepScore / step.maxScore : 0

            const hasAnyDetails = stepQuestions.some((q) => {
              const r = answers[q.id]?.rating
              return r === 'medium' || r === 'bad'
            })

            return (
              <section key={step.code} className="rounded-xl border border-slate-800 bg-slate-900/80">
                <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{step.title}</h3>
                    <p className="text-xs text-slate-400">Maksimum Puan: {step.maxScore.toFixed(2)}</p>
                  </div>

                  <div className="flex flex-col items-start gap-1 md:items-end">
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="text-slate-400">Adım Puanı:</span>
                      <span className="font-semibold text-sky-300">
                        {formatScore(stepScore)} / {step.maxScore.toFixed(2)}
                      </span>
                    </div>

                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${stepRatio >= 0.75 ? 'bg-emerald-400' : stepRatio >= 0.5 ? 'bg-amber-400' : 'bg-rose-500'
                          }`}
                        style={{ width: `${Math.min(stepRatio * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop TABLE */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-200">
                      <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-4 py-2">Madde</th>
                          <th className="px-4 py-2 w-full">Soru</th>
                          {hasAnyDetails && <th className="px-4 py-2 min-w-[160px]">Detaylar</th>}
                          <th className="px-4 py-2 min-w-[160px]">İyi / Orta / Kötü</th>
                          <th className="px-4 py-2 min-w-[80px]">Puan</th>
                        </tr>
                      </thead>

                      <tbody>
                        {stepQuestions.map((q) => {
                          const ans = answers[q.id]
                          const rating = ans?.rating
                          const point = rating != null ? q.maxScore * ratingFactor[rating] : undefined
                          const isMissing = hasAttempted && liveUnanswered.has(q.id)

                          return (
                            <tr key={q.id} className={`border-t border-slate-800/80 align-top ${isMissing ? 'bg-rose-950/40 border-l-4 border-l-rose-500' : ''}`}>
                              <td className="px-4 py-2 text-[11px] text-slate-400">
                                {step.order}.{q.order}
                              </td>

                              <td className="px-4 py-2 text-xs">
                                <span className={isMissing ? 'font-semibold text-rose-200' : ''}>{q.text}</span>
                                {isMissing && (
                                  <span className="ml-2 inline-flex items-center rounded-sm bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400 ring-1 ring-rose-500/40">
                                    ⚠ Yanıt Gerekli
                                  </span>
                                )}
                              </td>

                              {hasAnyDetails && (
                                <td className="px-4 py-2">
                                  {rating !== 'good' && (
                                    <button
                                      type="button"
                                      onClick={() => openDetailModal(q.id)}
                                      className="inline-flex items-center rounded-md border border-slate-600 bg-slate-950/70 px-2 py-1 text-[11px] hover:bg-slate-800"
                                    >
                                      {ans?.findingType ||
                                        ans?.explanation ||
                                        ans?.actionToTake ||
                                        (ans?.photos?.length ?? 0) > 0
                                        ? 'Detayı Gör / Düzenle'
                                        : 'Detay Gir'}
                                    </button>
                                  )}
                                </td>
                              )}

                              <td className="px-4 py-2">
                                <div className="flex gap-3 text-[11px]">
                                  <label className="inline-flex items-center gap-1">
                                    <input
                                      type="radio"
                                      name={q.id}
                                      value="good"
                                      checked={rating === 'good'}
                                      onChange={() => handleRatingChange(q.id, 'good')}
                                      className="h-3 w-3 border-slate-500 bg-slate-900 text-sky-400 focus:ring-sky-500"
                                    />
                                    <span>İyi</span>
                                  </label>
                                  <label className="inline-flex items-center gap-1">
                                    <input
                                      type="radio"
                                      name={q.id}
                                      value="medium"
                                      checked={rating === 'medium'}
                                      onChange={() => handleRatingChange(q.id, 'medium')}
                                      className="h-3 w-3 border-slate-500 bg-slate-900 text-sky-400 focus:ring-sky-500"
                                    />
                                    <span>Orta</span>
                                  </label>
                                  <label className="inline-flex items-center gap-1">
                                    <input
                                      type="radio"
                                      name={q.id}
                                      value="bad"
                                      checked={rating === 'bad'}
                                      onChange={() => handleRatingChange(q.id, 'bad')}
                                      className="h-3 w-3 border-slate-500 bg-slate-900 text-sky-400 focus:ring-sky-500"
                                    />
                                    <span>Kötü</span>
                                  </label>
                                </div>
                              </td>

                              <td className="px-4 py-2 text-xs font-semibold text-sky-300">{formatScore(point)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile */}
                <div className="divide-y divide-slate-800 md:hidden">
                  {stepQuestions.map((q) => {
                    const ans = answers[q.id]
                    const rating = ans?.rating
                    const point = rating != null ? q.maxScore * ratingFactor[rating] : undefined
                    const isOpen = expanded[q.id]

                    const ratingLabel =
                      rating === 'good' ? 'İyi' : rating === 'medium' ? 'Orta' : rating === 'bad' ? 'Kötü' : 'Seçilmedi'

                    const isMissingMobile = hasAttempted && liveUnanswered.has(q.id)

                    return (
                      <div key={q.id} className={`px-3 py-2 ${isMissingMobile ? 'bg-rose-950/40 border-l-4 border-rose-500' : ''}`}>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(q.id)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div className="flex-1">
                            <div className="text-[11px] text-slate-400">
                              {step.order}.{q.order}
                            </div>
                            <div className="mt-0.5 text-xs">
                              <span className={isMissingMobile ? 'font-semibold text-rose-200' : 'text-slate-100'}>{q.text}</span>
                              {isMissingMobile && (
                                <span className="ml-1 inline-flex items-center rounded-sm bg-rose-500/20 px-1 py-0.5 text-[10px] font-semibold text-rose-400">⚠</span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                {ratingLabel}
                              </span>
                              <span className="font-semibold text-sky-300">{formatScore(point)}</span>
                              <span className="text-[10px] text-slate-500">/ {q.maxScore.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="ml-2 flex items-center">
                            <span className="mr-1 text-[10px] text-slate-500">{isOpen ? 'Kapat' : 'Aç'}</span>
                            <span
                              className={`inline-block transform text-slate-400 transition-transform ${isOpen ? 'rotate-90' : 'rotate-0'
                                }`}
                            >
                              ▸
                            </span>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="mt-3 space-y-3">
                            {rating !== 'good' && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => openDetailModal(q.id)}
                                  className="inline-flex items-center rounded-md border border-slate-600 bg-slate-950/70 px-3 py-1.5 text-[11px] hover:bg-slate-800"
                                >
                                  {ans?.findingType ||
                                    ans?.explanation ||
                                    ans?.actionToTake ||
                                    (ans?.photos?.length ?? 0) > 0
                                    ? 'Detayı Gör / Düzenle'
                                    : 'Detay Gir'}
                                </button>
                              </div>
                            )}

                            <div>
                              <span className="mb-1 block text-[11px] font-medium text-slate-300">Değerlendirme</span>
                              <div className="flex flex-wrap gap-3 text-[11px]">
                                <label className="inline-flex items-center gap-1">
                                  <input
                                    type="radio"
                                    name={`${q.id}-mobile`}
                                    value="good"
                                    checked={rating === 'good'}
                                    onChange={() => handleRatingChange(q.id, 'good')}
                                    className="h-3 w-3 border-slate-500 bg-slate-900 text-sky-400 focus:ring-sky-500"
                                  />
                                  <span>İyi</span>
                                </label>
                                <label className="inline-flex items-center gap-1">
                                  <input
                                    type="radio"
                                    name={`${q.id}-mobile`}
                                    value="medium"
                                    checked={rating === 'medium'}
                                    onChange={() => handleRatingChange(q.id, 'medium')}
                                    className="h-3 w-3 border-slate-500 bg-slate-900 text-sky-400 focus:ring-sky-500"
                                  />
                                  <span>Orta</span>
                                </label>
                                <label className="inline-flex items-center gap-1">
                                  <input
                                    type="radio"
                                    name={`${q.id}-mobile`}
                                    value="bad"
                                    checked={rating === 'bad'}
                                    onChange={() => handleRatingChange(q.id, 'bad')}
                                    className="h-3 w-3 border-slate-500 bg-slate-900 text-sky-400 focus:ring-sky-500"
                                  />
                                  <span>Kötü</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {/* Özet & Aksiyonlar */}
          <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold text-slate-100">Değerlendirme Özeti</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Adım</th>
                    <th className="px-4 py-2">Puan</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => (
                    <tr key={step.code} className="border-t border-slate-800/80">
                      <td className="px-4 py-2 text-xs">{step.title}</td>
                      <td className="px-4 py-2 text-xs font-semibold text-sky-300">
                        {formatScore(stepScores[step.code])}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-700/80">
                    <td className="px-4 py-2 text-xs font-semibold">Toplam (100)</td>
                    <td className="px-4 py-2 text-xs font-bold text-emerald-300">{formatScore(totalScore)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {submitted && (
              <p className="text-xs text-emerald-300">
                {isOnline ? 'Form başarıyla gönderildi.' : 'Form offline kuyruğa alındı (internet gelince gönderilecek).'}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
              <div className="text-[11px] text-slate-400">
                <p>* Puanlama; İyi / Orta / Kötü seçimine göre otomatik hesaplanır.</p>
                <p>* Orta / Kötü seçimlerinde bulgu tipi, açıklama ve aksiyon alanları zorunludur.</p>
                <p>* Offline iken kayıt kuyruğa alınır.</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {hasAttempted && liveUnanswered.size > 0 && (
                  <p className="text-[11px] text-rose-400">
                    <span className="font-semibold">{liveUnanswered.size}</span> soru yanıt bekliyor — form kaydedilemez.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                  >
                    Temizle
                  </button>
                  <button
                    type="submit"
                    disabled={hasAttempted && liveUnanswered.size > 0}
                    title={hasAttempted && liveUnanswered.size > 0 ? `${liveUnanswered.size} soru yanıtlanmadan form kaydedilemez.` : undefined}
                    className={`inline-flex items-center gap-1.5 justify-center rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
                      hasAttempted && liveUnanswered.size > 0
                        ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                        : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                    }`}
                  >
                    Formu Kaydet
                    {hasAttempted && liveUnanswered.size > 0 && (
                      <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                        {liveUnanswered.size}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </form>

        {/* Soru bazlı Detay Modal */}
        {activeQuestion && activeAnswer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {activeQuestion.stepCode} - {activeQuestion.text}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-400">Orta / Kötü değerlendirmeler için detayları doldurun.</p>
                </div>
                <button type="button" onClick={closeDetailModal} className="text-sm text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Bulgu Tipi <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <select
                    value={activeAnswer.findingType ?? ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [activeQuestion.id]: {
                          ...ensureAnswer(prev, activeQuestion.id),
                          findingType: e.target.value || null,
                        },
                      }))
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  >
                    <option value="">Seçiniz</option>
                    {findingTypeOptions.length === 0 ? (
                      <option value="" disabled>
                        Yükleniyor...
                      </option>
                    ) : (
                      findingTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Açıklama <span className="text-rose-400">(Orta/Kötü için zorunlu)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={activeAnswer.explanation ?? ''}
                    onChange={(e) => handleExplanationChange(activeQuestion.id, e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    placeholder="Kısa açıklama girin..."
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">Fotoğraflar</label>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-md border border-slate-600 bg-slate-950/70 px-3 py-1.5 text-[11px] hover:bg-slate-800">
                      Fotoğraf(lar) Ekle
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handlePhotosAdd(activeQuestion.id, e.target.files)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>

                  {(activeAnswer.photos?.length ?? 0) > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {activeAnswer.photos.map((f, i) => (
                        <li
                          key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1"
                        >
                          <span className="truncate text-[11px] text-slate-300">
                            {i + 1}. {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePhotoRemove(activeQuestion.id, i)}
                            className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                          >
                            Sil
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500">Henüz fotoğraf eklenmedi.</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Alınacak Faaliyet <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <select
                    value={activeAnswer.actionToTake ?? ''}
                    onChange={(e) =>
                      handleActionToTakeChange(activeQuestion.id, (e.target.value as ActionToTake) || null)
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  >
                    <option value="">Seçiniz</option>
                    {actionToTakeOptions.length === 0 ? (
                      <option value="" disabled>
                        Yükleniyor...
                      </option>
                    ) : (
                      actionToTakeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Termin Tarihi <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <DateInput
                   
                    value={activeAnswer.dueDate ?? header.date}
                    onChange={(value) => handleDueDateChange(activeQuestion.id,  value)}
                   className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
/>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Tespit Edildiği Yer <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <input
                    type="text"
                    list="five-s-location-options"
                    value={activeAnswer.locationName ?? header.department}
                    onChange={(e) => handleLocationChange(activeQuestion.id, e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    placeholder="Örn: Bakım Onarım, Ofis girişi..."
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="rounded-md border border-slate-600 px-4 py-1.5 text-slate-200 hover:bg-slate-800"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="rounded-md bg-sky-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulgu Detay Modal (plan varken de aynı) */}
        {activeFinding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Bulgu Detayı</h3>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {String(activeFinding.finding_type ?? '-')} • {String(activeFinding.detected_date ?? '-')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFinding(null)}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-200">
                <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3 whitespace-pre-wrap">
                  {activeFinding.description || '-'}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-500">Termin:</span> {String(activeFinding.due_date ?? '-')}
                  </div>
                  <div>
                    <span className="text-slate-500">Sorumlu:</span> {String(activeFinding.responsible_name ?? '-')}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Lokasyon:</span> {String(activeFinding.location_name ?? '-')}
                  </div>
                </div>

                {getBeforePhotoResolvedUrls(activeFinding).length > 0 ? (
                  <div className="rounded-md border border-slate-800 bg-slate-950/30 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-200">Öncesi Fotoğraflar</div>
                    <div className="grid grid-cols-3 gap-2">
                      {getBeforePhotoResolvedUrls(activeFinding).map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          onClick={() => setPreviewUrl(url)}
                          className="group relative overflow-hidden rounded-md border border-slate-800 bg-slate-950/40 hover:border-slate-600"
                          title="Büyüt"
                        >
                          <img
                            src={url}
                            alt={`before-${idx + 1}`}
                            className="h-20 w-full object-cover transition-transform group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-slate-100">
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400">Fotoğrafa tıklayınca büyür.</div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">Öncesi fotoğraf yok.</div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveFinding(null)}
                  className="rounded-md border border-slate-600 px-4 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {previewUrl && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="relative w-full max-w-4xl">
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="absolute -top-10 right-0 rounded-md border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-900"
              >
                ✕ Kapat
              </button>

              <img
                src={previewUrl}
                alt="preview"
                className="max-h-[80vh] w-full rounded-xl border border-slate-700 object-contain bg-slate-950"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
