'use client'

import { atUtcMidnight, auditDateFor } from '@/app/_utils/auditDate'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { confirmDialog } from '@/app/_components/Global/ConfirmDialog'
import { readServerReasons } from '@/app/_components/Global/PasswordRules'
import Dexie, { type Table } from 'dexie'

import { useStore } from '@store/globalStore'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import { useGetUserRole } from '@/app/_hooks/user/useGetUserRole'
import { currentUserIdOf } from '@/app/_utils/currentUser'
import { looksOffline } from '@/app/_utils/offlineIdentity'
import { hasPrivilege } from '@/app/_utils/routeAccess'
import { UploadedFileInfo, useUploadAnswerPhoto } from '../bulgular/hooks/useUploadAnswersPhoto'
import { Question, questions as FALLBACK_QUESTIONS, StepCode, steps as FALLBACK_STEPS, Step } from './constants'
import { DateInput } from '@/app/_components/DateInput'
import { findingStatusLabelTr } from '@/app/_utils/StatusLabels'
import {
  buildFileUrl,
  getBeforePhotoResolvedUrls,
  mergeFilesUnique,
  normalizeBeforePhotos,
  type PhotoItem,
  resolvePhotoUrl,
  toPhotoArr,
} from '@/app/_utils/photos'
import { toast } from "sonner";
import {
  answerRowsFor,
  answersStillToSend,
  type AnswerRowPayload,
  scoreAudit,
  formatScore,
  isExplanationRequired,
  mapOpenFindingsByQuestion,
  RATING_FACTOR,
  requiresNewFinding,
  TARGET_SCORE,
} from './_utils/scoring'

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
  /**
   * "Bölge sorumlusu denetime katıldı" — ticked by the auditor. Not ticked,
   * the audit scores 0 (Notlar 07.10, Kurallar). Optional so drafts saved
   * before it existed still restore.
   */
  fieldManagerAttended?: boolean
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
  question_id?: string | null
  step_code?: string | null
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


function genUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Manual v4-like fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/* ───────────────────────────── Consts ───────────────────────────── */


const PLAN_KEYS = { GET: 'GET_FIVE_S_AUDIT_PLANS', UPDATE: 'UPDATE_FIVE_S_AUDIT_PLAN' } as const
/** What the auditor's submission makes of a plan; Merkez Ekip's approval makes it 'completed'. */
const PLAN_STATUS_SENT = 'pending_approval'
const USERS_KEYS = { GET: 'GET_USERS' } as const
const TEAM_KEYS = { GET: 'GET_FIVE_S_AUDIT_TEAMS' } as const
const TEAM_MEMBER_KEYS = { GET: 'GET_FIVE_S_AUDIT_TEAM_MEMBERS' } as const
const LOC_KEYS = { GET: 'GET_FIVE_S_LOCATIONS' } as const

const FINDING_TYPE_KEYS = { GET: 'GET_FIVE_S_FINDING_TYPES' } as const
const ACTION_KEYS = { GET: 'GET_FIVE_S_ACTIONS' } as const
const FINDINGS_KEYS = { GET: 'GET_FIVE_S_FINDINGS' } as const
// #12: editing a carried-out audit. PATCH, not UPDATE: UPDATE is a PUT and
// demands every NOT NULL column of the row.
const AUDIT_KEYS = { GET: 'GET_FIVE_S_AUDITS', PATCH: 'PATCH_FIVE_S_AUDIT' } as const
const ANSWER_KEYS = {
  GET: 'GET_FIVE_S_AUDIT_ANSWERS',
  ADD: 'ADD_FIVE_S_AUDIT_ANSWER',
  PATCH: 'PATCH_FIVE_S_AUDIT_ANSWER',
} as const
const STEP_KEYS = { GET: 'GET_FIVE_S_STEPS' } as const
const QUESTION_KEYS = { GET: 'GET_FIVE_S_QUESTIONS' } as const

const ME_KEY = 'GET_ME_V2' as const

// Madde 13: sunucu taraflı taslak (tablet devri için)
const DRAFT_KEYS = {
  GET: 'GET_FIVE_S_AUDIT_DRAFTS',
  ADD: 'ADD_FIVE_S_AUDIT_DRAFT',
  UPDATE: 'UPDATE_FIVE_S_AUDIT_DRAFT',
  DELETE: 'DELETE_FIVE_S_AUDIT_DRAFT',
} as const


/* ───────────────────────────── Helpers ───────────────────────────── */

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

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

/*
 * A failed call, with the HTTP status the client already had.
 *
 * startAsPromise used to reject with the error body alone. The status went
 * nowhere, so every "is this a refusal?" check below read `err.status` off a
 * body that never had one — always NaN — and a request the server turned down
 * on purpose went into the offline queue like a lost connection, to be retried
 * forever. createApiHook hands the code to onErrorHandle; it is kept here.
 * `status` is null when no response came back at all (network).
 */
type ApiCallError = Error & { body: unknown; status: number | null }

function apiCallError(body: unknown, code: number | null | undefined): ApiCallError {
  const message =
    typeof body === 'string'
      ? body
      : String((body as { message?: unknown } | null)?.message ?? 'Request failed')
  const err = new Error(message) as ApiCallError
  err.body = body
  err.status = typeof code === 'number' ? code : null
  return err
}

/*
 * A photo upload that failed during the offline replay, as an ApiCallError.
 * The upload hook throws a plain Error and writes the HTTP code into its
 * message ("File upload failed (503): …"); it is read back so the queue's
 * refusal rule applies to it like to any other request. No code (no
 * connection) is a passing failure, and the submission stays queued.
 */
function photoUploadError(err: unknown): ApiCallError {
  const message = String((err as { message?: unknown } | null)?.message ?? err ?? '')
  const code = Number(/\((\d{3})\)/.exec(message)?.[1])
  return apiCallError(`Fotoğraf yüklenemedi: ${message}`, Number.isFinite(code) ? code : null)
}

/*
 * One list read is capped at 200 rows by nucleus (MAX_PAGE_SIZE), whatever
 * `limit` asks for; lists that may be longer are read page by page.
 */
const LIST_PAGE_SIZE = 200
const LIST_MAX_PAGES = 50

/*
 * The answers that mean "the server read this and said no" — sending the same
 * request again will get the same answer. 401 (session), 408 (timeout), 429
 * (rate limit), 5xx and no answer at all are conditions that pass, so those
 * still go to, and stay in, the offline queue.
 */
const REFUSAL_STATUSES = new Set([400, 403, 404, 409, 415, 422])

function isRefusal(err: unknown): boolean {
  const status = (err as Partial<ApiCallError> | null)?.status
  return typeof status === 'number' && REFUSAL_STATUSES.has(status)
}

/**
 * A failure the offline copy should cover: no connection, no answer, a
 * timeout, a rate limit or a server error — the same conditions that keep a
 * submission in the queue. A refusal (4xx) is not one: the data is not
 * missing, the request is wrong.
 */
function isPassingFailure(err: unknown): boolean {
  if (looksOffline(err)) return true
  const status = (err as Partial<ApiCallError> | null)?.status
  return status == null || status === 408 || status === 429 || status >= 500
}

function serverReasonsOf(err: unknown): string[] {
  return readServerReasons((err as Partial<ApiCallError> | null)?.body ?? err)
}

function describeApiError(err: unknown): string {
  const reasons = serverReasonsOf(err)
  if (reasons.length > 0) return reasons.join(' ')
  return String((err as { message?: unknown } | null)?.message ?? err ?? 'sync error')
}

/** What to tell the auditor when the form could not even be put in the offline queue. */
function offlineSaveFailedText(err: unknown): string {
  const e = err as { name?: unknown; message?: unknown; inner?: { name?: unknown } } | null
  const quota = /quota/i.test(`${e?.name ?? ''} ${e?.inner?.name ?? ''} ${e?.message ?? ''}`)
  return quota
    ? 'Cihazın depolama alanı dolu: kayıt çevrimdışı kuyruğa alınamadı. Bu ekranı kapatmayın; cihazda yer açıp (ör. eski fotoğrafları silerek) ya da internete bağlanıp tekrar kaydedin.'
    : 'Kayıt çevrimdışı kuyruğa alınamadı (tarayıcı depolaması kullanılamıyor). Bu ekranı kapatmayın; internete bağlanınca tekrar kaydedin.'
}

/*
 * Who is filling the form: the signed-in user, as the login check holds them
 * (offline, the copy it remembered for this device). Not the user stored in
 * an offline snapshot — that is whoever last read the plans on this tablet.
 */
function identityOf(user: unknown): { id: string; name: string } {
  const envelope = (user && typeof user === 'object' ? user : {}) as { data?: unknown }
  const me = (envelope.data ?? envelope) as Record<string, any>
  const id = currentUserIdOf(user) || String(me?.sub ?? me?.userId ?? '')
  const first = me?.profile?.first_name ?? me?.profile?.firstName ?? me?.first_name ?? ''
  const last = me?.profile?.last_name ?? me?.profile?.lastName ?? me?.last_name ?? ''
  const name = `${first} ${last}`.trim() || String(me?.name ?? me?.email ?? '')
  return { id, name }
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
  question_id?: string | null
  step_code?: string | null
  auditor_user_id?: string | null
  client_finding_id: string  
  detected_date: string // YYYY-MM-DD
  location_name: string
  finding_type: string
  description: string
  action_to_take: string
  due_date?: string
  responsible_name: string
  responsible_user_id?: string | null
  auditor_name?: string
  /** "Tekil Bulgu", or "<lokasyon> · <gün>" of the audit it came from (#3). */
  form_title?: string
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
    /** 'single_finding' for the row a single finding is filed under (#23). */
    source?: string
    /*
     * The plan's location and the signed-in auditor, as the online save sends
     * them. The replay dropped both. Missing on submissions queued before
     * they were stored.
     */
    location_id?: string
    auditor_id?: string
  }
  findings: OfflineFindingPayload[]
  /*
   * The per-question answers (five_s_audit_answers), built exactly as the
   * online save posts them (scoring.ts → answerRowsFor). The queue carried
   * only the audit row and the findings, so an audit sent offline reached the
   * server with no answer rows at all. Missing on submissions queued before
   * this field existed; those replay without answers.
   */
  answers?: AnswerRowPayload[]
  /** The questions whose answer row already reached the server; a retry skips them. */
  syncedAnswerQuestionIds?: string[]
  /*
   * Photo row id -> what its upload returned. A finding whose second photo
   * failed is retried later; the photo that did get through is not uploaded
   * a second time.
   */
  syncedPhotoUploads?: Record<string, UploadedFileInfo>
  /*
   * Photos the server refused for good (too large, a 4xx, or an upload that
   * returned no file id). Retrying cannot help, so the finding goes without
   * them and the auditor is told; the queue does not stall on them.
   */
  skippedPhotoIds?: string[]
  /*
   * "Bölge sorumlusu denetime katıldı" as it was when the form was queued,
   * as a plain true/false — or null when the location has no field manager
   * and the rule does not apply. The replay stamps the plan with exactly this.
   * The header's own field is optional (drafts from before the tick), and an
   * untouched box there is `undefined`, which the replay sent as "no record".
   * Missing on submissions queued before this field existed.
   */
  fieldManagerAttended?: boolean | null
  // status info
  lastError?: string | null
  /*
   * Set when the server REFUSED this submission (a 4xx such as a business
   * rule), as opposed to not answering. Retrying would get the same answer, so
   * the sync skips it and the screen lists it with the reason until the
   * auditor retries or removes it.
   */
  setAsideAt?: number | null
  /*
   * What of this submission already reached the server.
   *
   * The replay creates the audit first and the findings after it. When a
   * finding failed, the whole submission stayed queued and the next sync
   * started again from "create audit" — so one bad finding produced a fresh,
   * duplicate audit on every retry, each with the same scores. Measured: the
   * audit create never sent `client_submission_id` either, so nothing on the
   * server could tell the copies apart (0 of 8 audits carried one).
   *
   * These two fields make a retry resume instead of restart.
   */
  syncedAuditId?: string | null
  syncedFindingIds?: string[]
  /*
   * The id the SERVER is given for this submission.
   *
   * Not the local `id`: that is a readable key like
   * "sub_1788897086363_a632a2f…" and the column is a uuid, so sending it
   * failed the whole sync with "Invalid ID format" — measured, the queue
   * stayed at 1 and nothing reached the database.
   */
  clientSubmissionId?: string
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

/** The last reference data read online, for opening the form with no connection. */
type SnapshotRow = { id: string; savedAt: number; data: unknown }

class FiveSOfflineDB extends Dexie {
  drafts!: Table<DraftRow, string>
  submissions!: Table<OfflineAuditSubmission, string>
  submissionPhotos!: Table<SubmissionPhotoRow, string>
  snapshots!: Table<SnapshotRow, string>

  constructor() {
    super('fiveS_offline_db_v1')
    this.version(1).stores({
      drafts: 'id, updatedAt, planId',
      submissions: 'id, createdAt, planId',
      submissionPhotos: 'id, submissionId, questionId',
    })
    this.version(2).stores({
      drafts: 'id, updatedAt, planId',
      submissions: 'id, createdAt, planId',
      submissionPhotos: 'id, submissionId, questionId',
      snapshots: 'id, savedAt',
    })
  }
}

/*
 * iPad with no connection (7 Oct mail: "internete bağlı olmadığı için sayfa
 * açılamıyor"). The service worker (public/offline-sw.js) brings the page itself up;
 * this brings up what the page reads — plans, teams, locations, questions —
 * from the last time it was read online. Without it an offline form opened
 * with no plan and the fallback question list.
 */
async function saveSnapshot(id: string, data: unknown): Promise<void> {
  try {
    await db?.snapshots.put({ id, savedAt: Date.now(), data })
  } catch (err) {
    console.warn('offline snapshot not saved', err)
  }
}

async function loadSnapshot<T>(id: string): Promise<T | null> {
  try {
    const row = await db?.snapshots.get(id)
    return (row?.data as T) ?? null
  } catch {
    return null
  }
}

const db = typeof window !== 'undefined' ? new FiveSOfflineDB() : (null as any)

/* ───────────────────────────── Page ───────────────────────────── */
export default function FiveSAuditFormPage() {
  const actions = useGenericApiActions()
  const { uploadAnswerPhoto } = useUploadAnswerPhoto()
  const { roleName, roles, isGod, userId: signedInUserId, isLoading: roleLoading } = useGetUserRole()
  // Read through a ref by fetchAssignment, which runs once from the mount effect.
  const store = useStore()
  const signedInUserRef = useRef<unknown>(null)
  signedInUserRef.current = store.user

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
  const [auditorMenuOpen, setAuditorMenuOpen] = useState(false)
  const [extraAuditorId, setExtraAuditorId] = useState('')

  /*
   * #12 (Foto 7): Merkez Ekip corrects a carried-out audit on this same
   * question screen. Opened from the home page with `?editAuditId=`; the form
   * is filled from the stored answers and saving rewrites that audit — its
   * scores and its answers — instead of filing a new one. Drafts, the plan
   * stamp and the single-finding form stay out of it.
   */
  const [editAudit, setEditAudit] = useState<{
    id: string
    answerIdByQuestion: Map<string, string>
    /*
     * The rating each question was saved with. A correction asks for — and
     * writes — a finding only for an answer it moves down from İyi (or from no
     * answer); an Orta/Kötü that was already there got its finding when the
     * audit was saved (scoring.ts → requiresNewFinding).
     */
    originalRatingByQuestion: Map<string, Rating | null>
    /** The attendance tick as the form opened; an untouched one is not rewritten. */
    initialFieldManagerAttended: boolean
    hadAnswers: boolean
  } | null>(null)
  const [singleFinding, setSingleFinding] = useState<{
    findingType: FindingType | ''
    explanation: string
    photos: File[]
    actionToTake: ActionToTake | ''
    dueDate: string
    linkedQuestionId: string
    /*
     * The single finding's own place and day. The modal's Lokasyon and Tarih
     * were bound to the audit's header, so picking a neighbouring location
     * there — even then pressing İptal — moved the planned audit itself to
     * that location (and a future day made it unsavable). They start from the
     * header's values and stay the modal's.
     */
    location: string
    date: string
  }>({
    findingType: '',
    explanation: '',
    photos: [],
    actionToTake: '',
    dueDate: '',
    linkedQuestionId: '',
    location: '',
    date: '',
  })

  const [assignmentLoading, setAssignmentLoading] = useState(true)
  const [assignedPlan, setAssignedPlan] = useState<PlanRow | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const [availablePlans, setAvailablePlans] = useState<PlanRow[]>([])
  const [planSelectionMode, setPlanSelectionMode] = useState(false)
  const [planMetaMap, setPlanMetaMap] = useState<Record<string, { locationName: string; teamName: string }>>({})

  const [missingQuestions, setMissingQuestions] = useState<Set<string>>(new Set())

  const [teamMemberOptions, setTeamMemberOptions] = useState<Array<{ id: string; name: string }>>([])
  const assignmentDataRef = useRef<{
    members: TeamMemberRowLite[]
    teams: TeamRow[]
    usersById: Map<string, string>
    /** normLoc(location name) -> every field manager of that location. */
    fieldManagerIdsByLoc: Map<string, string[]>
  }>({ members: [], teams: [], usersById: new Map(), fieldManagerIdsByLoc: new Map() })

  const [locationResponsibleMap, setLocationResponsibleMap] = useState<
    Map<string, { userId: string; userName: string }>
  >(new Map())

  const [planUpdateKey] = useState(() => PLAN_KEYS.UPDATE)

  const [findingsLoading, setFindingsLoading] = useState(false)
  const [findings, setFindings] = useState<FiveSFindingLite[]>([])
  /*
   * Single findings waiting in the offline queue, by the question they are
   * linked to. They are not on the server yet, so the open-findings list read
   * from it cannot show them — and offline the form then demanded a second
   * finding for the very defect just recorded.
   */
  const [queuedSingleFindings, setQueuedSingleFindings] = useState<Array<{ questionId: string; location: string }>>([])
  /** Queued submissions the server refused (setAsideAt), shown with the reason. */
  const [refusedSubmissions, setRefusedSubmissions] = useState<Array<{ id: string; label: string; error: string }>>([])
  const [activeFinding, setActiveFinding] = useState<FiveSFindingLite | null>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  /*
   * #5: a photo picked for a finding can be looked at before saving. The list
   * showed only file names — "IMG_4012.jpg" — so the only way to check which
   * picture was attached was to save and open the finding afterwards.
   */
  const localPreviewRef = useRef<string | null>(null)
  const viewLocalPhoto = (file: File) => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    const url = URL.createObjectURL(file)
    localPreviewRef.current = url
    setPreviewUrl(url)
  }

  /** Single findings still in the offline queue for one location, by question. */
  const queuedQuestionIdsAt = (location: string) => {
    const here = normLoc(location)
    if (!here) return []
    return queuedSingleFindings.filter((q) => normLoc(q.location) === here).map((q) => q.questionId)
  }
  // Madde 1: Açık bulgusu olan sorular (soru satırı uyarısı için)
  // Question id -> the numbers of its open findings (#35: the row shows "#7",
  // not just a count). Rules in scoring.ts → mapOpenFindingsByQuestion.
  const openFindingsByQuestion = useMemo(
    () => mapOpenFindingsByQuestion(findings, queuedQuestionIdsAt(header.department)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [findings, queuedSingleFindings, header.department]
  )

  /*
   * A non-good answer normally has to carry a finding — type, action, due date.
   * Not when the question ALREADY has an open finding: that is the finding.
   *
   * Measured by the customer (Notlar 07.10, satır 3 ve 16): a single finding was
   * linked to a question, the question was first rated "İyi", the close-time
   * warning made them change it to "Kötü" — and the form then demanded a second
   * finding for the same problem and refused to save. The warning exists to get
   * the rating right, not to make them record the defect twice. Details stay
   * available; they are just no longer required, and nothing is written unless
   * they are filled in.
   */
  const needsFindingDetails = (questionId: string, ans: { rating: Rating | null }) =>
    requiresNewFinding(ans.rating, {
      hasOpenFinding: openFindingsByQuestion.has(questionId),
      storedRating: editAudit ? (editAudit.originalRatingByQuestion.get(questionId) ?? null) : undefined,
    })

  /*
   * #12: an answer a correction leaves exactly as it was saved. It passed the
   * form's checks when the audit was sent; re-checking it now (an old record
   * may predate the explanation rule) would block saving over a question the
   * editor never touched.
   */
  const isUnchangedStoredAnswer = (questionId: string, rating: Rating | null | undefined) =>
    !!editAudit &&
    rating != null &&
    editAudit.originalRatingByQuestion.has(questionId) &&
    editAudit.originalRatingByQuestion.get(questionId) === rating

  // Offline / Sync UI
  /*
   * The plan's own scheduled date, kept apart from the form's.
   *
   * The "Plan: … • …" line used to print `header.date`, which was the same
   * value. It no longer is: the form's date cannot run ahead of today, while
   * a plan legitimately sits in the future. Printing the form's date under a
   * "Plan:" label would state the wrong schedule.
   */
  const [planDate, setPlanDate] = useState<string>('')
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)
  const [queuedCount, setQueuedCount] = useState<number>(0)
  const draftSaveTimer = useRef<number | null>(null)

  /*
   * A save in flight. Nothing stopped a second tap: a double tap — or a
   * second one on a slow field connection — sent two audits for one plan,
   * each with its own answers, findings and plan stamp. A ref, not only the
   * state, for the same reason as syncingRef: a second tap can arrive before
   * React has re-rendered the button as disabled.
   *
   * An audit that went through (sent, or queued offline) keeps the form
   * locked ('done'): the page is leaving, or the plan's audit is already in
   * the queue, and sending it again is exactly the duplicate this prevents.
   */
  const submitLockRef = useRef(false)
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'done'>('idle')
  // The single-finding modal's save; unlocked after every attempt, since a
  // second single finding is a legitimate thing to record.
  const singleSaveLockRef = useRef(false)
  const [singleSaving, setSingleSaving] = useState(false)

  // Madde 13: plan başına sunucu taslak kaydının id'si
  const serverDraftIdRef = useRef<string | null>(null)
  const serverDraftSavingRef = useRef(false)

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
      location: header.department,
      date: header.date,
      dueDate: prev.dueDate || header.date,
      linkedQuestionId: '',
    }))
    setSingleFindingOpen(true)
  }
  const closeSingleFindingModal = () => setSingleFindingOpen(false)

  /*
   * hasPrivilege, not a literal list of role names — the last place in the app
   * still deciding this way. Matching "manager", "content manager core team"
   * and "auditor" by name meant the root account, whose role is godmin and
   * nothing else, never saw the "Tekil Bulgu +" button at all. Same dead end as
   * the audit form and the questions editor had.
   */
  const canCreateSingleFinding = useMemo(() => {
    if (roleLoading) return false
    const names = [roleName ?? '', ...(roles ?? []).map((r) => r.name ?? '')]
    // isGod: the root account's power is its flag, not a role name. Without it
    // godmin could not open a single finding while Merkez Ekip could
    // (Notlar 07.10, satır 26).
    return hasPrivilege(names, ['manager', 'content manager core team', 'auditor', 'super admin'], isGod)
  }, [roleName, roles, roleLoading, isGod])

  /*
   * Whoever plans the audits — and the root account — must be able to open one
   * without being on the team that was assigned it. Without this the screen
   * tells an administrator "your team has no audit", which is true, useless,
   * and a dead end: there is no other way into the form.
   */
  const [isOwnTeamSelection, setIsOwnTeamSelection] = useState(true)
  const canOpenAnyPlanRef = useRef(false)
  const canOpenAnyPlan = useMemo(() => {
    if (roleLoading) return false
    const names = [roleName ?? '', ...(roles ?? []).map((r) => r.name ?? '')]
    // 'superadmin' never matched the role as it is spelled ("Super Admin"), and
    // Merkez Ekip — who plans the audits — was missing altogether.
    return hasPrivilege(names, ['manager', 'content manager core team', 'super admin'], isGod)
  }, [roleName, roles, roleLoading, isGod])

  canOpenAnyPlanRef.current = canOpenAnyPlan

  /*
   * The attendance rule needs someone to attend. A location with no field
   * manager defined has nobody whose absence could zero the audit: the box is
   * not shown, the rule is not applied, and the plan records no attendance
   * (null) rather than a "did not attend" that nobody could have avoided.
   */
  const locationHasFieldManager = locationResponsibleMap.has(normLoc(header.department))
  /** What the plan is stamped with: the tick, or null where the rule does not apply. */
  const fieldManagerAttendanceToRecord: boolean | null = locationHasFieldManager
    ? header.fieldManagerAttended === true
    : null

  // The plain 5S sum plus the plant's own rules (scoring.ts → scoreAudit).
  const auditScore = useMemo(
    () =>
      scoreAudit(steps, questions, answers, {
        fieldManagerAttended: !locationHasFieldManager || header.fieldManagerAttended === true,
      }),
    [answers, questions, steps, header.fieldManagerAttended, locationHasFieldManager]
  )
  const stepScores = auditScore.stepScores
  const totalScore = auditScore.total

  // Gerçek zamanlı eksik/tamamlanmamış soru seti
  const liveUnanswered = useMemo(() => {
    const s = new Set<string>()
    for (const q of questions) {
      const ans = answers[q.id]
      if (!ans || !ans.rating) { s.add(q.id); continue }
      if (isUnchangedStoredAnswer(q.id, ans.rating)) continue
      if (isExplanationRequired(q, ans) && !ans.explanation.trim()) s.add(q.id)
      if (needsFindingDetails(q.id, ans)) {
        if (!ans.findingType) s.add(q.id)
        if (!ans.actionToTake?.trim()) s.add(q.id)
        if (!ans.dueDate) s.add(q.id)
        const loc = (ans.locationName?.trim() || header.department || '').trim()
        if (!loc) s.add(q.id)
      }
    }
    return s
  }, [questions, answers, header.department, openFindingsByQuestion, editAudit])

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
        onErrorHandle: (err: any, code?: number | null, requestId?: string) => {
          args?.onErrorHandle?.(err, code, requestId)
          // The status goes with it: see apiCallError.
          reject(apiCallError(err, code))
        },
      })
    })

  const handleHeaderChange = (field: keyof AuditFormHeader, value: string) => {
    setHeader((prev) => ({ ...prev, [field]: value }))
  }

  // Denetime aktif katılan denetçiler (çoklu seçim) — header.auditorName virgülle ayrılmış isimler
  const selectedAuditors = useMemo(
    () =>
      header.auditorName
        ? header.auditorName.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    [header.auditorName]
  )
  const toggleAuditor = (name: string) => {
    const exists = selectedAuditors.includes(name)
    const next = exists ? selectedAuditors.filter((n) => n !== name) : [...selectedAuditors, name]
    handleHeaderChange('auditorName', next.join(', '))
  }

  const handleRatingChange = (questionId: string, rating: Rating) => {
    setAnswers((prev) => {
      const current = ensureAnswer(prev, questionId)
      const next: AnswersState = { ...prev, [questionId]: { ...current, rating } }
      return next
    })
    // A question that already has an open finding needs no second one (nor an
    // answer a correction found already below İyi); the detail panel stays one
    // click away but is not forced open.
    if (needsFindingDetails(questionId, { rating })) openDetailModal(questionId)
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

  /*
   * The modal's place and day. Inside a planned audit (or a correction) they
   * stay the modal's own. With no plan there is no audit to disturb, and the
   * page's open-findings panel follows the place picked here, as it did.
   */
  const handleSingleFindingPlaceChange = (field: 'location' | 'date', value: string) => {
    handleSingleFindingFieldChange(field, value)
    if (!assignedPlan && !editAudit) handleHeaderChange(field === 'location' ? 'department' : 'date', value)
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

  /*
   * The queue as the screen shows it: what is waiting to be sent (the count,
   * and the single findings among it), and what the server refused.
   */
  const refreshQueuedCount = async () => {
    try {
      if (!db) return
      const all = (await db.submissions.toArray()) as OfflineAuditSubmission[]
      const pending = all.filter((s) => !s.setAsideAt)
      setQueuedCount(pending.length)
      setQueuedSingleFindings(
        pending
          .filter((s) => s.auditPayload?.source === 'single_finding')
          .flatMap((s) =>
            (s.findings ?? [])
              .filter((f) => !!f.question_id)
              .map((f) => ({ questionId: String(f.question_id), location: String(f.location_name ?? '') }))
          )
      )
      setRefusedSubmissions(
        all
          .filter((s) => !!s.setAsideAt)
          .map((s) => ({
            id: s.id,
            label: `${s.auditPayload?.source === 'single_finding' ? 'Tekil bulgu' : 'Denetim'} — ${
              s.auditPayload?.department_name ?? '-'
            } · ${s.auditPayload?.audit_date ?? '-'}`,
            error: s.lastError ?? '',
          }))
      )
    } catch {
      // ignore
    }
  }

  /** A refused submission goes back into the queue; the auto-sync picks it up when online. */
  const retryRefusedSubmission = async (id: string) => {
    try {
      await db?.submissions.update(id, { setAsideAt: null })
    } finally {
      await refreshQueuedCount()
    }
  }

  const discardRefusedSubmission = async (id: string, label: string) => {
    const ok = await confirmDialog({
      title: 'Kayıt kuyruktan çıkarılsın mı?',
      message: `${label} sunucu tarafından reddedildi ve cihazda bekliyor. Çıkarılırsa bu kayıt ve fotoğrafları cihazdan silinir; geri alınamaz.`,
      confirmLabel: 'Kuyruktan çıkar',
      cancelLabel: 'Vazgeç',
      tone: 'danger',
    })
    if (!ok || !db) return
    try {
      /*
       * The audit may already be on the server — a finding was refused after
       * the audit itself got through. Then the plan must still leave the
       * "planned" list before the device forgets it, or the same plan is
       * offered again and audited twice.
       */
      const s = (await db.submissions.get(id)) as OfflineAuditSubmission | undefined
      if (s?.syncedAuditId && s.planId && s.auditPayload?.source !== 'single_finding') {
        try {
          await stampPlanSent(
            s.planId,
            s.syncedAuditId,
            typeof (s as { fieldManagerAttended?: unknown }).fieldManagerAttended === 'boolean'
              ? ((s as { fieldManagerAttended?: boolean }).fieldManagerAttended as boolean)
              : null
          )
        } catch (err) {
          console.error('plan stamp before discard failed', err)
        }
      }
      await db.transaction('rw', db.submissions, db.submissionPhotos, async () => {
        await db.submissionPhotos.where('submissionId').equals(id).delete()
        await db.submissions.delete(id)
      })
    } catch (err) {
      console.error('refused submission not removed', err)
      toast.error('Kayıt kuyruktan çıkarılamadı.')
    } finally {
      await refreshQueuedCount()
    }
  }

  const saveServerDraft = async (planId: string, nextHeader: AuditFormHeader, answersLite: any[]) => {
    if (serverDraftSavingRef.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const A = actions as any
    const answersMap = Object.fromEntries(answersLite.map((a: any) => [String(a.questionId), a]))
    try {
      serverDraftSavingRef.current = true
      if (serverDraftIdRef.current) {
        const startUpdate = safeStart(A, DRAFT_KEYS.UPDATE)
        if (!startUpdate) return
        await startAsPromise(startUpdate, {
          payload: {
            _id: serverDraftIdRef.current,
            header: nextHeader as any,
            answers: answersMap,
            updated_by_user_id: currentUserId || undefined,
            updated_by_name: nextHeader.auditorName || undefined,
          },
        })
      } else {
        const startAdd = safeStart(A, DRAFT_KEYS.ADD)
        if (!startAdd) return
        const resp = await startAsPromise(startAdd, {
          payload: {
            plan_id: planId,
            header: nextHeader as any,
            answers: answersMap,
            updated_by_user_id: currentUserId || undefined,
            updated_by_name: nextHeader.auditorName || undefined,
          },
        })
        const newId = resp?.data?.id ?? resp?.id ?? resp?.data?.[0]?.id ?? null
        if (newId) serverDraftIdRef.current = String(newId)
      }
    } catch (e) {
      console.warn('server draft save error', e)
    } finally {
      serverDraftSavingRef.current = false
    }
  }

  const saveDraftDebounced = (planId: string | null, nextHeader: AuditFormHeader, nextAnswers: AnswersState) => {
    if (!db) return
    if (draftSaveTimer.current) window.clearTimeout(draftSaveTimer.current)
    draftSaveTimer.current = window.setTimeout(async () => {
      const answersLite = Object.values(nextAnswers).map((a) => ({
        questionId: a.questionId,
        rating: a.rating,
        explanation: a.explanation,
        findingType: a.findingType,
        actionToTake: a.actionToTake ?? null,
        dueDate: a.dueDate ?? '',
        locationName: a.locationName ?? '',
      }))

      try {
        const draftKey = makeDraftKey(planId, nextHeader)
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

      // Madde 13: plan bazlı taslaklar sunucuya da yazılır — aynı ekipteki
      // başka bir kullanıcı başka cihazdan devam edebilsin.
      if (planId) {
        await saveServerDraft(planId, nextHeader, answersLite)
      }
    }, 800)
  }

  const applyDraftAnswers = (arr: any[]) => {
    setAnswers((prev) => {
      const base = { ...prev }
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
  }

  // Madde 13: önce sunucu taslağı dene (başka kullanıcı/cihaz devri), yoksa lokal
  const tryRestoreServerDraft = async (planId: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false
    try {
      const A = actions as any
      const startGet = safeStart(A, DRAFT_KEYS.GET)
      if (!startGet) return false

      const resp = await startAsPromise(startGet, {
        payload: { page: 1, limit: 1, filters: { plan_id: planId } },
      })
      const arr = extractArray(resp)
      const draft = arr?.[0]
      if (!draft) return false

      serverDraftIdRef.current = String(draft.id)

      const h = draft.header as Partial<AuditFormHeader> | null
      if (h && typeof h === 'object') {
        setHeader((prev) => ({
          teamName: String(h.teamName ?? prev.teamName),
          department: String(h.department ?? prev.department),
          // Same reason as the local draft: a stored future date would come
          // back as a form the API refuses to accept.
          date: auditDateFor(String(h.date ?? prev.date), prev.date),
          auditorName: String(h.auditorName ?? prev.auditorName),
          // The tick decides the score; the colleague taking over the tablet
          // must see the one that was set, not an empty box.
          fieldManagerAttended:
            typeof h.fieldManagerAttended === 'boolean' ? h.fieldManagerAttended : prev.fieldManagerAttended,
        }))
      }

      const answersObj = draft.answers && typeof draft.answers === 'object' ? draft.answers : {}
      const answersArr = Array.isArray(answersObj) ? answersObj : Object.values(answersObj)
      if (answersArr.length > 0) applyDraftAnswers(answersArr as any[])

      if (draft.updated_by_name) {
        console.log(`Sunucu taslağı yüklendi (son güncelleyen: ${draft.updated_by_name})`)
      }
      return true
    } catch (e) {
      console.warn('server draft restore error', e)
      return false
    }
  }

  const tryRestoreDraft = async (planId: string | null, h: AuditFormHeader) => {
    // Önce sunucu taslağı (plan bazlı)
    if (planId) {
      const restored = await tryRestoreServerDraft(planId)
      if (restored) return
    }

    try {
      if (!db) return
      const draftKey = makeDraftKey(planId, h)
      const draft = await db.drafts.get(draftKey)
      if (!draft) return

      /*
       * The draft is the real state — except for its date. A draft saved
       * against a plan scheduled for December carries December, and since the
       * API now refuses an audit dated in the future, restoring it verbatim
       * would hand the auditor a form that cannot be saved and no clue why.
       */
      setHeader({
        ...draft.header,
        date: auditDateFor(draft.header?.date, h.date),
      })

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

    // Madde 13: sunucu taslağını da sil
    if (serverDraftIdRef.current) {
      try {
        const A = actions as any
        const startDelete = safeStart(A, DRAFT_KEYS.DELETE)
        if (startDelete) {
          await startAsPromise(startDelete, {
            payload: { _id: serverDraftIdRef.current },
          })
        }
      } catch (e) {
        console.warn('server draft delete error', e)
      } finally {
        serverDraftIdRef.current = null
      }
    }
  }

  const enqueueSubmission = async (submission: OfflineAuditSubmission, photos: SubmissionPhotoRow[]) => {
    // Returning quietly here let the caller announce "kuyruğa eklendi" for a
    // form that was stored nowhere.
    if (!db) throw new Error('offline storage unavailable')
    await db.transaction('rw', db.submissions, db.submissionPhotos, async () => {
      await db.submissions.put(submission)
      if (photos.length) await db.submissionPhotos.bulkPut(photos)
    })
    await refreshQueuedCount()
  }

  /*
   * The audit an earlier replay of this submission already created, found by
   * the uuid the submission presents (client_submission_id). Null when there
   * is none or it cannot be read; the refusal then stands.
   */
  const findAuditOfSubmission = async (submissionUuid: string): Promise<string | null> => {
    const startGet = safeStart(actions as any, AUDIT_KEYS.GET)
    if (!startGet || !isUuid(submissionUuid)) return null
    try {
      const resp = await startAsPromise(startGet, {
        payload: {
          page: 1,
          limit: 1,
          filters: [{ field: 'client_submission_id', operator: 'eq', value: submissionUuid }],
        },
      })
      const row = (extractArray(resp) as any[]).find(
        (a) => String(a?.client_submission_id ?? a?.clientSubmissionId ?? '') === submissionUuid
      )
      return row?.id ? String(row.id) : null
    } catch {
      return null
    }
  }

  /*
   * The finding an earlier replay already created, found by its
   * client_finding_id. A reply lost on a flaky link leaves the finding on the
   * server but not in syncedFindingIds; with the unique index the retry gets
   * 409, and this picks up the existing row instead of setting the whole
   * submission aside.
   */
  const findingExists = async (clientFindingId: string): Promise<boolean> => {
    const startGet = safeStart(actions as any, FINDINGS_KEYS.GET)
    if (!startGet || !isUuid(clientFindingId)) return false
    try {
      const resp = await startAsPromise(startGet, {
        payload: {
          page: 1,
          limit: 1,
          filters: [{ field: 'client_finding_id', operator: 'eq', value: clientFindingId }],
        },
      })
      return (extractArray(resp) as any[]).some(
        (f) => String(f?.client_finding_id ?? f?.clientFindingId ?? '') === clientFindingId
      )
    } catch {
      return false
    }
  }

  const syncOfflineQueue = async () => {
    if (!db) return
    /*
     * A ref, not the `syncing` state: the auto-sync effect and the button each
     * hold the state of the render they came from, so both could start a
     * replay — and two replays of the same submission, before either has
     * written `syncedAuditId`, create the audit twice.
     */
    if (syncing || syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)

    let refusedNow = 0
    let sentNow = 0
    let answersRefusedNow = 0
    let skippedPhotosNow = 0

    try {
      const A = actions as any
      const startAudit = A?.ADD_FIVE_S_AUDIT?.start
      const startFinding = A?.ADD_FIVE_S_FINDING?.start
      const startAnswer = A?.[ANSWER_KEYS.ADD]?.start

      if (!startAudit || !startFinding) {
        console.warn('Sync: required actions not found')
        return
      }

      const all = (await db.submissions.orderBy('createdAt').toArray()) as OfflineAuditSubmission[]
      for (const s of all) {
        // Refused before: the same request would be refused again.
        if (s.setAsideAt) continue
        try {
          // 1) create audit — unless a previous attempt already did
          //
          // The uuid is minted once and kept, so a retry presents the same
          // key and the unique index can recognise it.
          let submissionUuid = s.clientSubmissionId
          if (!isUuid(submissionUuid)) {
            submissionUuid = genUUID()
            await db.submissions.update(s.id, { clientSubmissionId: submissionUuid })
          }

          let auditResp: any = null
          if (!s.syncedAuditId) {
            try {
              auditResp = await startAsPromise(startAudit, {
                payload: {
                  department_name: s.auditPayload.department_name,
                  auditor_name: s.auditPayload.auditor_name,
                  audit_date: atUtcMidnight(s.auditPayload.audit_date),
                  total_score: s.auditPayload.total_score,
                  target_score: s.auditPayload.target_score,
                  score_s1: s.auditPayload.score_s1,
                  score_s2: s.auditPayload.score_s2,
                  score_s3: s.auditPayload.score_s3,
                  score_s4: s.auditPayload.score_s4,
                  score_s5: s.auditPayload.score_s5,
                  // The column exists so the server can recognise a replay of
                  // the same queued form; nothing was ever writing it.
                  client_submission_id: submissionUuid,
                  /*
                   * Which plan this was, and whether it is a single finding. The
                   * replay dropped both: an audit done offline reached the server
                   * attached to no plan, the plan stayed "Planlandı" forever, and
                   * a queued single finding counted as a 0-point audit.
                   */
                  plan_id: s.planId ?? undefined,
                  source: s.auditPayload.source ?? undefined,
                  // As the online save sends them; absent on older submissions.
                  location_id: s.auditPayload.location_id || undefined,
                  auditor_id: s.auditPayload.auditor_id || undefined,
                },
              })
            } catch (err) {
              /*
               * A refusal (409: the plan's audit already exists, or the
               * client_submission_id is taken) may be THIS submission: an
               * earlier attempt created the audit and its answer never came
               * back. Then that audit is the one to resume against; setting
               * the submission aside would leave it with no answers, no
               * findings and no plan stamp.
               */
              const mine = isRefusal(err) ? await findAuditOfSubmission(submissionUuid) : null
              if (!mine) throw err
              auditResp = { id: mine }
            }
          }

          const auditId =
            s.syncedAuditId ??
            auditResp?.data?.id ??
            auditResp?.id ??
            auditResp?.data?.[0]?.id ??
            null
          if (!auditId) throw new Error('Sync: auditId not returned')
          /*
           * Written down before a single finding is attempted. If the next
           * step throws, the retry resumes against THIS audit instead of
           * creating another one.
           */
          if (!s.syncedAuditId) {
            s.syncedAuditId = auditId
            await db.submissions.update(s.id, { syncedAuditId: auditId })
          }

          /*
           * 2) the per-question answers, the same rows the online save posts.
           *
           * One at a time, each written down as it lands, so a retry after a
           * dropped connection resumes with the next question instead of
           * posting the ones already there a second time. As online, a
           * refused answer is reported and does not hold the audit back; a
           * passing failure stops here and keeps the submission queued.
           */
          const answersSent = new Set(s.syncedAnswerQuestionIds ?? [])
          for (const row of answersStillToSend(s.answers, s.syncedAnswerQuestionIds)) {
            if (!startAnswer) throw new Error('Sync: answer action not found')
            try {
              await startAsPromise(startAnswer, { payload: { audit_id: auditId, ...row } })
            } catch (err) {
              if (!isRefusal(err)) throw err
              answersRefusedNow += 1
              console.error('Sync: answer refused', s.id, row.question_id, describeApiError(err))
            }
            answersSent.add(row.question_id)
            s.syncedAnswerQuestionIds = [...answersSent]
            await db.submissions.update(s.id, { syncedAnswerQuestionIds: s.syncedAnswerQuestionIds })
          }

          // 3) findings
          const photos = await db.submissionPhotos.where('submissionId').equals(s.id).toArray()
          const byQuestion = new Map<string, SubmissionPhotoRow[]>()
          for (const p of photos) {
            const key = String(p.questionId)
            const arr = byQuestion.get(key) ?? []
            arr.push(p)
            byQuestion.set(key, arr)
          }

          const alreadySynced = new Set(s.syncedFindingIds ?? [])
          for (const f of s.findings) {
            // A finding that got through on an earlier attempt is not sent
            // again; without this, one late failure duplicated every finding
            // that had already succeeded.
            if (alreadySynced.has(f.client_finding_id)) continue
            const key = String(f.questionId)
            const relatedPhotos = byQuestion.get(key) ?? []

            /*
             * Upload photos and build before files.
             *
             * A failed upload stops this submission here. It used to be logged
             * and skipped: the finding was created without that photo and the
             * blobs were deleted at cleanup, so on a flaky link the "before"
             * photos were lost for good. Now the finding waits, the
             * submission and its blobs stay queued, and the next sync resumes
             * — photos that did get through are not uploaded again, findings
             * already created are not created again.
             */
            const uploaded: UploadedFileInfo[] = []
            /*
             * A refusal that retrying cannot fix (413: too large; any 4xx;
             * an answer with no file id) skips that one photo instead of
             * stalling the submission forever or setting it aside with
             * "discard everything" as the only way out. Passing failures (no
             * connection, 5xx, 401, 408, 429) still stop here and retry.
             */
            const skipForGood = async (photoId: string) => {
              s.skippedPhotoIds = [...new Set([...(s.skippedPhotoIds ?? []), photoId])]
              await db.submissions.update(s.id, { skippedPhotoIds: s.skippedPhotoIds })
              skippedPhotosNow += 1
            }
            for (const p of relatedPhotos) {
              const done = s.syncedPhotoUploads?.[p.id]
              if (done) {
                uploaded.push(done)
                continue
              }
              if (s.skippedPhotoIds?.includes(p.id)) continue
              const file = new File([p.blob], p.name, { type: p.type, lastModified: p.lastModified })
              let up: UploadedFileInfo | undefined
              try {
                up = await uploadAnswerPhoto({ file })
              } catch (err) {
                console.error('Sync upload error', err)
                const failure = photoUploadError(err)
                if (failure.status === 413 || isRefusal(failure)) {
                  await skipForGood(p.id)
                  continue
                }
                throw failure
              }
              if (!up?.fileId && !up?.fileUrl) {
                await skipForGood(p.id)
                continue
              }
              uploaded.push(up)
              s.syncedPhotoUploads = { ...(s.syncedPhotoUploads ?? {}), [p.id]: up }
              await db.submissions.update(s.id, { syncedPhotoUploads: s.syncedPhotoUploads })
            }

            const primary = uploaded[0]
            const beforeArr = toPhotoArr(uploaded)

            try {
              await startAsPromise(startFinding, {
                payload: {
                  audit_id: auditId,
                  question_id: f.question_id ?? (f.questionId !== 'SINGLE' ? f.questionId : undefined),
                  step_code:
                    f.step_code ??
                    (f.questionId !== 'SINGLE' ? String(f.questionId).split('-')[0] : undefined),
                  auditor_user_id: f.auditor_user_id ?? undefined,
                  // Eski kuyruktaki geçersiz (UUID olmayan) id'leri temizle
                  client_finding_id: isUuid(f.client_finding_id) ? f.client_finding_id : genUUID(),
                  detected_date: f.detected_date,
                  location_name: f.location_name,
                  finding_type: f.finding_type,
                  description: f.description,
                  action_to_take: f.action_to_take,
                  due_date: f.due_date || undefined,
                  responsible_name: f.responsible_name,
                  responsible_user_id: f.responsible_user_id || undefined,
                  auditor_name: f.auditor_name || s.auditPayload.auditor_name || undefined,
                  form_title: f.form_title || undefined,

                  photo_before_files: beforeArr,
                  photo_before_file_id: primary?.fileId,
                  photo_before_url: primary?.fileUrl,
                },
              })
            } catch (err) {
              // Already on the server from an attempt whose reply was lost.
              if (!(isRefusal(err) && (await findingExists(f.client_finding_id)))) throw err
            }

            alreadySynced.add(f.client_finding_id)
            await db.submissions.update(s.id, { syncedFindingIds: [...alreadySynced] })
          }

          // 4) the plan goes to Merkez Ekip for approval, as the online path does
          if (s.planId && s.auditPayload.source !== 'single_finding') {
            // The tick as queued; older submissions only had it on the header.
            const fromHeader = s.header?.fieldManagerAttended
            const attended: boolean | null =
              s.fieldManagerAttended !== undefined
                ? s.fieldManagerAttended
                : typeof fromHeader === 'boolean'
                  ? fromHeader
                  : null
            try {
              await stampPlanSent(s.planId, auditId, attended)
            } catch (err) {
              if (!isRefusal(err)) throw err
              /*
               * The plan was deleted (or otherwise refuses the stamp) while
               * this sat in the queue. The audit and its findings are on the
               * server by now; keeping the submission would only retry the
               * stamp forever and, worse, offer to resend an audit that exists.
               * So it is cleaned up, and the auditor is told the plan part did
               * not go through.
               */
              const note = describeApiError(err)
              console.warn('Sync: plan not stamped, submission cleaned up', s.id, note)
              toast.warning(
                `${s.auditPayload.department_name} denetimi gönderildi ancak plan onaya gönderilemedi: ${note}. Lütfen Merkez Ekibe bildirin.`
              )
            }
          }

          // 5) cleanup submission
          await db.transaction('rw', db.submissions, db.submissionPhotos, async () => {
            await db.submissionPhotos.where('submissionId').equals(s.id).delete()
            await db.submissions.delete(s.id)
          })
          sentNow += 1
          await refreshQueuedCount()
        } catch (err: any) {
          const msg = describeApiError(err)
          console.error('Sync submission failed', s.id, msg)
          if (isRefusal(err)) {
            /*
             * The server read the audit (or a finding) and said no. That
             * answer does not change on the next try, and retrying it on every
             * reconnect is what kept a refused form "in the queue" for good.
             * What already got through stays recorded (syncedAuditId /
             * syncedFindingIds), so a retry after the cause is fixed resumes.
             */
            refusedNow += 1
            await db.submissions.update(s.id, { lastError: msg, setAsideAt: Date.now() })
          } else {
            await db.submissions.update(s.id, { lastError: msg })
          }
          // tek bir kayıt patladıysa diğerlerini denemeye devam edelim
        }
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
      await refreshQueuedCount()
    }

    if (refusedNow > 0) {
      toast.error(
        `${refusedNow} çevrimdışı kayıt sunucu tarafından reddedildi; sebebiyle birlikte cihazda bekletiliyor.`
      )
    }
    // Same words as the online save: the audit itself went through.
    if (answersRefusedNow > 0) {
      toast.error(
        `${answersRefusedNow} soru yanıtı kaydedilemedi. Denetim kaydedildi, ayrıntı için yöneticinize bildirin.`
      )
    }
    if (skippedPhotosNow > 0) {
      toast.error(
        `${skippedPhotosNow} fotoğraf sunucu tarafından kabul edilmedi (ör. dosya çok büyük); ilgili bulgu fotoğrafsız gönderildi.`
      )
    }
    // What was just sent is on the server now; the open-findings list should say so.
    if (sentNow > 0 && header.department?.trim()) void fetchFindings(header.department)
  }

  /** One location's open findings; the panel's list, and the single-finding modal's check (R3). */
  const readOpenFindings = async (locationName: string): Promise<FiveSFindingLite[]> => {
    const loc = (locationName ?? '').trim()
    if (!loc) return []
    // Per user and location, like the assignment snapshot.
    const snapshotKey = signedInUserId ? `findings:${signedInUserId}:${normLoc(loc)}` : ''

    try {
      const A = actions as any
      const startFindings = safeStart(A, FINDINGS_KEYS.GET)

      /*
       * #8: the auditor sees this location's OPEN findings, read-only — the
       * ones the audit has to look at again. Closed ones were listed too, and
       * the whole register was read (limit 5000) to pick out one location in
       * the browser. Both narrowings now happen on the server.
       */
      const resp = startFindings
        ? await startAsPromise(startFindings, {
          payload: {
            page: 1,
            limit: 500,
            orderBy: 'finding_no',
            orderDirection: 'desc',
            filters: [
              { field: 'is_active', operator: 'eq', value: true },
              { field: 'location_name', operator: 'ilike', value: loc },
              { field: 'status', operator: 'in', value: ['open', 'in_progress'] },
            ],
          },
        })
        : null

      const list = extractArray(resp) as FiveSFindingLite[]
      const filtered = (list ?? []).filter((f) => normLoc(String(f?.location_name ?? '')) === normLoc(loc))
      if (snapshotKey) void saveSnapshot(snapshotKey, filtered)
      return filtered
    } catch (e) {
      /*
       * Offline, the open findings as last read here. They are what stops the
       * form from demanding a second finding for a question that already has
       * one, and what raises the "İyi seçildi ama açık bulgu var" warning;
       * with an empty list offline both silently stopped working.
       */
      const snap = snapshotKey && isPassingFailure(e) ? await loadSnapshot<FiveSFindingLite[]>(snapshotKey) : null
      if (snap) return snap
      console.error('fetchFindings error', e)
      return []
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
      setFindings(await readOpenFindings(loc))
    } finally {
      setFindingsLoading(false)
    }
  }

  /*
   * The single-finding modal's place may not be the audit's. Its open
   * findings are read on their own then, so the modal can say when the
   * linked question already has one there (R3).
   */
  const [singleFindingPlaceFindings, setSingleFindingPlaceFindings] = useState<FiveSFindingLite[]>([])
  const singleFindingOtherPlace =
    singleFindingOpen && !!singleFinding.location.trim() && normLoc(singleFinding.location) !== normLoc(header.department)
      ? singleFinding.location.trim()
      : ''
  useEffect(() => {
    if (!singleFindingOtherPlace) {
      setSingleFindingPlaceFindings((prev) => (prev.length ? [] : prev))
      return
    }
    let stale = false
    void readOpenFindings(singleFindingOtherPlace).then((list) => {
      if (!stale) setSingleFindingPlaceFindings(list)
    })
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleFindingOtherPlace])
  const singleFindingLinkedOpen: string[] = (() => {
    const qid = singleFinding.linkedQuestionId
    if (!singleFindingOpen || !qid || !singleFinding.location.trim()) return []
    const map = singleFindingOtherPlace
      ? mapOpenFindingsByQuestion(singleFindingPlaceFindings, queuedQuestionIdsAt(singleFindingOtherPlace))
      : openFindingsByQuestion
    return map.get(qid) ?? []
  })()

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

      /*
       * Every row a list read matches, page by page (LIST_PAGE_SIZE). Asking
       * for `limit: 1000` got the first 200 rows and no word about the rest.
       * A tie-breaking sort keeps the pages from overlapping; ids are also
       * de-duplicated in case they do.
       */
      async function readAllPages(startFn: (args: any) => void, payload: Record<string, unknown>): Promise<any[]> {
        const rows: any[] = []
        const seen = new Set<string>()
        for (let page = 1; page <= LIST_MAX_PAGES; page++) {
          const resp = await startAsPromise(startFn, { payload: { ...payload, page, limit: LIST_PAGE_SIZE } })
          const batch = extractArray(resp)
          for (const row of batch) {
            const id = row?.id != null ? String(row.id) : ''
            if (id && seen.has(id)) continue
            if (id) seen.add(id)
            rows.push(row)
          }
          const hasNext = resp?.pagination?.hasNext ?? resp?.data?.pagination?.hasNext
          if (batch.length < LIST_PAGE_SIZE || hasNext === false) break
        }
        return rows
      }

      async function readReferenceData() {
        const [plansR, teamsR, membersR, locsR, findingTypesR, actionR, usersR] = await Promise.all([
        /*
         * Only the plans this screen can open: active, still planned. The
         * whole table was read with limit 1000, which nucleus clamps to 200
         * sorted newest date first — past ~200 plans an older open plan the
         * home page offers was cut off and the form said "Ekibinize planlanan
         * bir denetim yok". An audit being corrected reads its own plan by id.
         */
        startPlans
          ? readAllPages(startPlans, {
            filters: [
              { field: 'status', operator: 'eq', value: 'planned' },
              { field: 'is_active', operator: 'eq', value: true },
            ],
            sort: [
              { field: 'planned_date', direction: 'desc' },
              { field: 'id', direction: 'asc' },
            ],
          })
          : Promise.resolve(null),

        startTeams
          ? startAsPromise(startTeams, {
            payload: { page: 1, limit: 2000, orderBy: 'created_at', orderDirection: 'desc' },
          })
          : Promise.resolve(null),

        // Active memberships only (nothing here reads the others), every page of them.
        startMembers
          ? readAllPages(startMembers, {
            filters: [{ field: 'is_active', operator: 'eq', value: true }],
            sort: [
              { field: 'created_at', direction: 'desc' },
              { field: 'id', direction: 'asc' },
            ],
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

        // Capped the same way (limit 500 -> 200): a team member past the
        // 200th user had no name and dropped out of "Denetimi Yapan".
        // A stable order, as the other two paged reads have: without one the
        // pages are LIMIT/OFFSET over an unordered scan, and a login rewriting
        // a user row between two pages can skip someone.
        startUsers
          ? readAllPages(startUsers, {
            sort: [
              { field: 'created_at', direction: 'asc' },
              { field: 'id', direction: 'asc' },
            ],
          })
          : Promise.resolve(null),
        ])
        return {
          plans: extractArray(plansR),
          teams: extractArray(teamsR),
          members: extractArray(membersR),
          locs: extractArray(locsR),
          findingTypes: extractArray(findingTypesR),
          actionList: extractArray(actionR),
          users: extractArray(usersR),
        }
      }
      type Sources = {
        plans: any[]
        teams: any[]
        members: any[]
        locs: any[]
        findingTypes: any[]
        actionList: any[]
        users: any[]
      }

      /*
       * Identity is the signed-in user (see identityOf) — online or not. The
       * snapshot used to carry its own copy of "me", so a tablet that two
       * auditors share opened offline as whoever had last read the plans:
       * their name in "Denetimi Yapan", their team's plans on the list.
       */
      const signedIn = identityOf(signedInUserRef.current)
      let uidVal = signedIn.id
      let auditorFallback = signedIn.name
      if (!uidVal && startMe && !looksOffline()) {
        const meResp = await startAsPromise(startMe, { payload: {} })
        const me = identityOf(meResp?.data ?? meResp?.response?.data ?? meResp)
        uidVal = me.id
        auditorFallback = auditorFallback || me.name
      }
      setCurrentUserId(uidVal)

      // One snapshot per user: what this person's plans looked like, not the last reader's.
      const snapshotKey = uidVal ? `assignment:${uidVal}` : ''
      let sources: Sources
      try {
        sources = await readReferenceData()
        if (snapshotKey) {
          void saveSnapshot(snapshotKey, sources)
          // The old shared snapshot carried another person's identity; drop it.
          void db?.snapshots.delete('assignment').catch(() => undefined)
        }
      } catch (err) {
        /*
         * Only a missing connection falls back to the snapshot. A refusal
         * (a permission removed, a session ended) answered with yesterday's
         * plans would let the form be filled in for work the server will
         * not take.
         */
        if (!isPassingFailure(err)) throw err
        const snap = snapshotKey ? await loadSnapshot<Sources>(snapshotKey) : null
        if (!snap) throw err
        sources = snap
        toast.message('İnternet yok: form, son çevrimiçi okunan plan bilgileriyle açıldı.')
      }

      const plansResp = sources.plans
      const teamsResp = sources.teams
      const membersResp = sources.members
      const locsResp = sources.locs
      const findingTypesResp = sources.findingTypes
      const actionResp = sources.actionList
      const usersResp = sources.users

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

      const pendingLocRespMap = new Map<string, { userId: string; userName: string }>()

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

      /*
       * Passive locations count too. A location made passive keeps its open
       * plans — the delete guard itself says "lokasyonu pasif yapın" while
       * plans are open — and skipping it hid the attendance tick, left the
       * rule's zero unapplied and recorded no attendance for those plans.
       * Active ones go first, and a passive one never replaces an active one
       * that has the same name.
       */
      const fieldManagerIdsByLoc = new Map<string, string[]>()
      const activeFirst = [...locs].sort((a, b) => Number(!!b?.is_active) - Number(!!a?.is_active))
      for (const l of activeFirst) {
        if (!l?.name) continue
        if (!l.is_active && fieldManagerIdsByLoc.has(normLoc(l.name))) continue
        const ids: string[] = Array.isArray((l as any).field_manager_user_ids)
          ? (l as any).field_manager_user_ids.map(String)
          : []
        fieldManagerIdsByLoc.set(normLoc(l.name), ids)
        const firstId = ids[0] ?? ''
        const userName = firstId ? (usersById.get(firstId) ?? '') : ''
        if (firstId) {
          pendingLocRespMap.set(normLoc(l.name), { userId: firstId, userName })
        }
      }
      setLocationResponsibleMap(new Map(pendingLocRespMap))

      assignmentDataRef.current = { members, teams, usersById, fieldManagerIdsByLoc }

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

      const urlEditAuditId =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('editAuditId')
          : null
      if (urlEditAuditId) {
        const startAudits = safeStart(A, AUDIT_KEYS.GET)
        const startAnswers = safeStart(A, ANSWER_KEYS.GET)
        const [auditResp, answersResp] = await Promise.all([
          startAudits
            ? startAsPromise(startAudits, { payload: { page: 1, limit: 1, filters: { id: urlEditAuditId } } })
            : Promise.resolve(null),
          startAnswers
            ? startAsPromise(startAnswers, {
              payload: { page: 1, limit: 500, filters: { audit_id: urlEditAuditId } },
            })
            : Promise.resolve(null),
        ])
        const audit = extractArray(auditResp)[0] as any
        if (!audit) {
          toast.error('Düzenlenecek denetim bulunamadı.')
          return
        }
        /*
         * The audit's plan, read by its id. It was looked up in the list
         * above, which holds only the open plans (and once held only the
         * first 200 of all of them): an audit's plan is not open any more, so
         * it was missed, and the attendance tick then opened as "attended" —
         * a stored 0 for the field manager's absence was quietly lifted by
         * the next save.
         */
        const editPlanId =
          String(audit.plan_id ?? audit.planId ?? '').trim() ||
          String(new URLSearchParams(window.location.search).get('planId') ?? '').trim()
        let plan: PlanRow | undefined
        let planUnreadable = false
        if (editPlanId && startPlans) {
          try {
            const planResp = await startAsPromise(startPlans, {
              payload: { page: 1, limit: 1, filters: [{ field: 'id', operator: 'eq', value: editPlanId }] },
            })
            const row = (extractArray(planResp) as any[]).find((p) => String(p?.id ?? '') === editPlanId)
            if (row) plan = { ...row, planned_date: normalizeDateYYYYMMDD(row?.planned_date) } as PlanRow
          } catch (err) {
            console.error('edit: plan not read', err)
            planUnreadable = true
          }
        }
        // Not there (deleted, or the read failed): the list, as before.
        if (!plan && editPlanId) plan = plans.find((p) => String(p.id) === editPlanId)
        const answerRows = extractArray(answersResp) as any[]
        const answerIdByQuestion = new Map<string, string>()
        const originalRatingByQuestion = new Map<string, Rating | null>()
        const loaded: AnswersState = {}
        for (const row of answerRows) {
          const qid = String(row?.question_id ?? '')
          if (!qid) continue
          answerIdByQuestion.set(qid, String(row.id))
          originalRatingByQuestion.set(qid, (row?.rating ?? null) as Rating | null)
          loaded[qid] = {
            questionId: qid,
            rating: (row?.rating ?? null) as Rating | null,
            explanation: String(row?.explanation ?? ''),
            photos: [],
            findingType: (row?.finding_type ?? null) as FindingType | null,
            actionToTake: null,
            dueDate: '',
            locationName: '',
          }
        }
        /*
         * Attended unless the plan holds the NEW tick's "no".
         *
         * Before the tick existed the plan's field_manager_attended was a
         * guess — "was the field manager's name among the auditors?" — and was
         * false for most audits whose score was never zeroed. Read as the
         * tick, opening such an audit for a correction zeroed it. The tick is
         * the only writer that zeroes the audit with its "no" (scoreAudit), so
         * a recorded false on an audit stored with a non-zero total is the old
         * guess, not the tick, and is not held against it.
         *
         * With no plan to read (deleted, the read failed, or the audit never
         * had one) attendance is unknown, and an unknown is not a "yes": a
         * stored 0 might be the tick's, so the box opens empty and the 0
         * stays unless the editor ticks it.
         */
        const recordedAttendance = (plan as any)?.field_manager_attended
        const storedTotal = Number(audit.total_score ?? audit.totalScore ?? Number.NaN)
        const initialFieldManagerAttended = plan
          ? !(recordedAttendance === false && storedTotal === 0)
          : storedTotal !== 0
        // Said only where the rule applies: a location with a field manager.
        if (!plan && storedTotal === 0 && pendingLocRespMap.has(normLoc(String(audit.department_name ?? '')))) {
          toast.warning(
            planUnreadable
              ? 'Denetimin planı okunamadı; bölge sorumlusunun katılıp katılmadığı bilinmiyor. Kayıtlı 0 puan korunuyor: katıldıysa "Bölge sorumlusu denetime katıldı" kutusunu işaretleyin.'
              : 'Denetimin planı bulunamadı; bölge sorumlusunun katılıp katılmadığı bilinmiyor. Kayıtlı 0 puan korunuyor: katıldıysa "Bölge sorumlusu denetime katıldı" kutusunu işaretleyin.'
          )
        }
        setEditAudit({
          id: String(audit.id),
          answerIdByQuestion,
          originalRatingByQuestion,
          initialFieldManagerAttended,
          hadAnswers: answerRows.length > 0,
        })
        setAnswers((prev) => ({ ...prev, ...loaded }))
        if (plan) {
          setAssignedPlan(plan)
          setPlanDate(String(plan.planned_date ?? '').slice(0, 10))
          setTeamMemberOptions(buildTeamMemberOptions(plan.assigned_team_id, members, teams, usersById))
        }
        setHeader({
          teamName: (plan && teams.find((t) => t.id === plan.assigned_team_id)?.name) || '—',
          department: String(audit.department_name ?? ''),
          auditorName: String(audit.auditor_name ?? ''),
          date: normalizeDateYYYYMMDD(String(audit.audit_date ?? '')) || header.date,
          fieldManagerAttended: initialFieldManagerAttended,
        })
        return
      }

      /*
       * #27: not the audit of a location this person is field manager of —
       * someone on an audit team can be responsible for a place at the same
       * time. Merkez Ekip, who may open any plan, is not held to it; the
       * server applies the same rule.
       */
      const isFieldManagerOf = (p: PlanRow) => {
        const loc = locs.find((l) => l.id === p.location_id) as any
        const ids: unknown[] = Array.isArray(loc?.field_manager_user_ids) ? loc.field_manager_user_ids : []
        return !!uidVal && ids.map(String).includes(String(uidVal))
      }
      /*
       * A plan whose audit is already in this device's offline queue is done
       * as far as the auditor is concerned. Offline the snapshot still lists
       * it as "planned" — it was read before the audit was filled in — and
       * online the server keeps saying so until the queue is replayed; either
       * way it was offered again and a second audit for it could be queued.
       * A refused submission no longer stands for the plan, unless its audit
       * already reached the server.
       */
      const queuedPlanIds = new Set<string>()
      try {
        const queued = ((await db?.submissions.toArray()) ?? []) as OfflineAuditSubmission[]
        for (const s of queued) {
          if (!s.planId || s.auditPayload?.source === 'single_finding') continue
          if (s.setAsideAt && !s.syncedAuditId) continue
          queuedPlanIds.add(String(s.planId))
        }
      } catch {
        // No offline store: nothing is queued.
      }
      const activePlans = plans.filter(
        (p) =>
          p?.is_active &&
          p?.status === 'planned' &&
          !p?.audit_id &&
          !queuedPlanIds.has(String(p.id)) &&
          (canOpenAnyPlanRef.current || !isFieldManagerOf(p))
      )
      const matched = activePlans.filter((p) => {
        const s = memberSetByTeam.get(p.assigned_team_id)
        return !!s && !!uidVal && s.has(String(uidVal))
      })

      // Madde 7: Ana sayfadan planId ile gelindiyse o planı direkt seç
      const urlPlanId =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('planId')
          : null
      if (urlPlanId) {
        const target = matched.find((p) => String(p.id) === String(urlPlanId))
        if (target) {
          const metaMapUrl: Record<string, { locationName: string; teamName: string }> = {
            [target.id]: {
              locationName: locs.find((l) => l.id === target.location_id)?.name ?? '',
              teamName: teams.find((t) => t.id === target.assigned_team_id)?.name ?? '',
            },
          }
          setPlanMetaMap(metaMapUrl)
          setAssignedPlan(target)

          const memberOptsUrl = buildTeamMemberOptions(target.assigned_team_id, members, teams, usersById)
          setTeamMemberOptions(memberOptsUrl)

          const nextHeaderUrl = {
            teamName: metaMapUrl[target.id]?.teamName ?? '',
            department: metaMapUrl[target.id]?.locationName ?? '',
            date: auditDateFor(target.planned_date, header.date),
            auditorName: header.auditorName || auditorFallback,
          } satisfies AuditFormHeader
          setPlanDate(String(target.planned_date ?? '').slice(0, 10))
          setHeader(nextHeaderUrl)

          await tryRestoreDraft(target.id, nextHeaderUrl)
          return
        }
      }

      if (matched.length === 0 && canOpenAnyPlanRef.current && activePlans.length > 0) {
        const metaAll: Record<string, { locationName: string; teamName: string }> = {}
        for (const p of activePlans) {
          metaAll[p.id] = {
            locationName: locs.find((l) => l.id === p.location_id)?.name ?? '',
            teamName: teams.find((t) => t.id === p.assigned_team_id)?.name ?? '',
          }
        }
        setPlanMetaMap(metaAll)
        setAvailablePlans(activePlans)
        setIsOwnTeamSelection(false)
        setPlanSelectionMode(true)
        setHeader((prev) => ({ ...prev, auditorName: prev.auditorName || auditorFallback }))
        return
      }

      if (matched.length === 0) {
        setAssignedPlan(null)
        setHeader((prev) => ({
          ...prev,
          auditorName: prev.auditorName || auditorFallback,
        }))
        return
      }

      const metaMap: Record<string, { locationName: string; teamName: string }> = {}
      for (const p of matched) {
        metaMap[p.id] = {
          locationName: locs.find((l) => l.id === p.location_id)?.name ?? '',
          teamName: teams.find((t) => t.id === p.assigned_team_id)?.name ?? '',
        }
      }
      setPlanMetaMap(metaMap)

      if (matched.length > 1) {
        setAvailablePlans(matched)
        setIsOwnTeamSelection(true)
        setPlanSelectionMode(true)
        setHeader((prev) => ({ ...prev, auditorName: prev.auditorName || auditorFallback }))
        return
      }

      const chosen = matched[0]!
      setAssignedPlan(chosen)

      const teamName = metaMap[chosen.id]?.teamName ?? ''
      const locName = metaMap[chosen.id]?.locationName ?? ''

      const memberOpts = buildTeamMemberOptions(chosen.assigned_team_id, members, teams, usersById)
      setTeamMemberOptions(memberOpts)

      const nextHeader = {
        teamName,
        department: locName,
        date: auditDateFor(chosen.planned_date, header.date),
        auditorName: header.auditorName || auditorFallback,
      } satisfies AuditFormHeader

      setPlanDate(String(chosen.planned_date ?? '').slice(0, 10))
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

    const { members, teams, usersById } = assignmentDataRef.current
    const memberOpts = buildTeamMemberOptions(plan.assigned_team_id, members, teams, usersById)
    setTeamMemberOptions(memberOpts)

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

      let rawSteps = extract(stepsRes)
      let rawQ = extract(qRes)
      // Offline: the questions as last read, not the built-in fallback list.
      if (rawSteps.length > 0 && rawQ.length > 0) {
        void saveSnapshot('questions', { rawSteps, rawQ })
      } else {
        const snap = await loadSnapshot<{ rawSteps: any[]; rawQ: any[] }>('questions')
        if (snap) {
          rawSteps = rawSteps.length > 0 ? rawSteps : snap.rawSteps
          rawQ = rawQ.length > 0 ? rawQ : snap.rawQ
        }
      }

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
    // Editing a carried-out audit is not a draft of a new one.
    if (editAudit) return
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
    <section className="mt-6 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bu Lokasyondaki Açık Bulgular</div>
          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
            Lokasyon: <span className="text-slate-800 dark:text-slate-200">{header.department || '-'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queuedCount > 0 ? (
            <button
              type="button"
              onClick={syncOfflineQueue}
              disabled={!isOnline || syncing}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-3 py-2 text-[11px] hover:bg-slate-100 hover:dark:bg-slate-950 disabled:opacity-50"
              title={!isOnline ? 'Offline iken senkron yapılamaz' : 'Kuyruğu senkronla'}
            >
              {syncing ? 'Senkron...' : `Senkronla (${queuedCount})`}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => fetchFindings(header.department)}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-3 py-2 text-[11px] hover:bg-slate-100 hover:dark:bg-slate-950"
          >
            Yenile
          </button>

        </div>
      </div>

      {findingsLoading ? (
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">Bulgular yükleniyor...</div>
      ) : findings.length === 0 ? (
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">Bu lokasyonda açık bulgu yok.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-800 dark:text-slate-200">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
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
                <tr key={f.id} className="border-t border-slate-300 dark:border-slate-800/80">
                  <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400">{f.finding_no ?? idx + 1}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300">{String(f.detected_date ?? '-')}</td>
                  <td className="px-3 py-2">{String(f.finding_type ?? '-')}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300">{findingStatusLabelTr(f.status)}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300">{String(f.due_date ?? '-')}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300">{String(f.responsible_name ?? '-')}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setActiveFinding(f)}
                      className="inline-flex items-center rounded-md border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950/60 px-2 py-1 text-[11px] hover:bg-slate-200 hover:dark:bg-slate-800"
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

  /*
   * Queued records the server refused. They are not retried on their own any
   * more (that loop never ended), so they have to be visible: what it was,
   * why it was refused, and a way to try again or let it go.
   */
  const RefusedQueueNotice =
    refusedSubmissions.length > 0 ? (
      <div className="mt-3 rounded-md border border-rose-400/60 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-[11px] text-rose-800 dark:text-rose-200">
        <div className="font-semibold">
          Sunucunun reddettiği {refusedSubmissions.length} kayıt cihazda bekliyor (otomatik gönderilmez)
        </div>
        <ul className="mt-1 space-y-1.5">
          {refusedSubmissions.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <span>
                <span className="font-medium">{r.label}</span>
                {r.error ? <span className="block text-rose-700 dark:text-rose-300">{r.error}</span> : null}
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => void retryRefusedSubmission(r.id)}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-800 dark:text-slate-200 hover:bg-slate-100 hover:dark:bg-slate-900"
                >
                  Tekrar dene
                </button>
                <button
                  type="button"
                  onClick={() => void discardRefusedSubmission(r.id, r.label)}
                  className="rounded-md border border-rose-400/60 px-2 py-0.5 text-[11px] text-rose-700 dark:text-rose-300 hover:bg-rose-100 hover:dark:bg-rose-950/50"
                >
                  Kuyruktan çıkar
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    ) : null

  /*
   * #3: which audit a finding came from, written on the finding itself so the
   * register can show and filter it. Same words as the backend's backfill of
   * older rows (be-nucleus/src/boot.ts).
   */
  const SINGLE_FINDING_TITLE = 'Tekil Bulgu'
  const auditTitle = () => {
    const [y, m, d] = (header.date ?? '').slice(0, 10).split('-')
    return [header.department.trim(), y && m && d ? `${d}.${m}.${y}` : ''].filter(Boolean).join(' · ')
  }

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

  /**
   * Queues the form for the offline replay; true when it is safely stored.
   * `clientSubmissionId` is the uuid an online attempt already sent, so the
   * replay can recognise that audit if the attempt did reach the server.
   */
  const enqueueAuditAndFindingsFromForm = async (clientSubmissionId?: string): Promise<boolean> => {
    const { S1, S2, S3, S4, S5 } = stepScores

    const submissionId = makeUid('sub')
    const planId = assignedPlan?.id ?? null

    const auditPayload: OfflineAuditSubmission['auditPayload'] = {
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
      location_id: assignedPlan?.location_id || undefined,
      auditor_id: currentUserId || undefined,
    }

    const nonGoodAnswers = Object.values(answers).filter((ans) => ans.rating && ans.rating !== 'good')
    const detectedDate = header.date

    const findingsPayload: OfflineFindingPayload[] = []
    const photoRows: SubmissionPhotoRow[] = []

    for (const ans of nonGoodAnswers) {
      const q = questions.find((qq) => qq.id === ans.questionId)
      if (!q) continue
      if (!ans.findingType) continue
      if (!needsFindingDetails(ans.questionId, ans)) continue

      const effectiveLocationName = ans.locationName?.trim() || header.department.trim() || 'Bilinmeyen Lokasyon'
      const description = buildFindingDescriptionFromAnswer(ans, q, header.teamName)

      const locKey = normLoc(effectiveLocationName)
      const responsible = locationResponsibleMap.get(locKey) ?? null

      findingsPayload.push({
        questionId: ans.questionId,
        question_id: ans.questionId,
        step_code: q.stepCode,
        auditor_user_id: currentUserId || null,
        client_finding_id: genUUID(),
        detected_date: detectedDate,
        location_name: effectiveLocationName,
        finding_type: ans.findingType,
        description,
        action_to_take: (ans.actionToTake ?? '').trim(),
        due_date: ans.dueDate || undefined,
        responsible_name: responsible?.userName || header.auditorName,
        responsible_user_id: responsible?.userId || null,
        auditor_name: header.auditorName.trim(),
        form_title: auditTitle(),
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
      // The same rows the online save writes, decided now, against the open
      // findings the form knows about now.
      answers: answerRowsFor(questions, answers, (qid) => openFindingsByQuestion.has(qid), new Date().toISOString()),
      fieldManagerAttended: fieldManagerAttendanceToRecord,
      lastError: null,
      clientSubmissionId: isUuid(clientSubmissionId) ? clientSubmissionId : undefined,
    }

    /*
     * Photos are stored as blobs, and a tablet's browser storage fills up.
     * When the queue write failed the error went nowhere: the auditor saw
     * nothing, or — when the store was missing — "kuyruğa eklendi" for a form
     * kept nowhere, and closed the screen. The draft is cleared only after the
     * form is safely queued, and a failure says so.
     */
    try {
      await enqueueSubmission(submission, photoRows)
    } catch (err) {
      console.error('offline enqueue failed', err)
      toast.error(offlineSaveFailedText(err))
      return false
    }
    await clearDraft(planId, header)

    setSubmitted(true)
    toast.success('İnternet yok veya kayıt hatası oluştu. Form offline kuyruğa eklendi. İnternet gelince otomatik senkronlanır.')
    return true
  }

  /*
   * The plan, stamped as sent.
   *
   * It used to be stamped `completed` here. The customer's rule (#28) is that
   * an audit is finished when Merkez Ekip approves it, so the auditor's
   * submission now puts the plan in "Onay Bekliyor" and the server refuses
   * `completed` from anyone but Merkez Ekip.
   */
  const stampPlanSent = async (planId: string, auditId: string, fieldManagerAttended: boolean | null) => {
    const startUpdate = safeStart(actions as any, planUpdateKey)
    if (!startUpdate) return
    await startAsPromise(startUpdate, {
      payload: {
        _id: planId,
        status: PLAN_STATUS_SENT,
        audit_id: auditId,
        auditor_attended: true,
        ...(fieldManagerAttended === null ? {} : { field_manager_attended: fieldManagerAttended }),
      },
    })
  }

  const markPlanCompleted = async (planId: string, auditId: string) => {
    // Gönderilen planı yerel listeden çıkar; tekrar görünüp seçilememeli
    setAvailablePlans((prev) => prev.filter((p) => p.id !== planId))
    try {
      // Denetim planına uyum raporu için katılım bilgisi: denetçi(ler) formu
      // gönderdiğine göre katıldı sayılır; saha sorumlusunu denetçi işaretler.
      // The auditor's own tick, which also decides the score — no record
      // (null, the field left untouched) where the location has no field manager.
      await stampPlanSent(planId, auditId, fieldManagerAttendanceToRecord)
    } catch (err) {
      /*
       * This is not "kritik değil". If the plan is not stamped, it stays
       * `planned` with no audit_id: the auditor is shown the same audit again
       * next time and whoever planned it sees work that was never done.
       * Measured while narrowing the auditor's permissions — the audit saved
       * with a score of 100.00 and the plan stayed open, silently, because the
       * stamp was refused.
       */
      console.error('Plan tamamlandı olarak işaretlenemedi', err)
      toast.error(
        'Denetim kaydedildi ancak plan onaya gönderilemedi. Lütfen yöneticinize bildirin.'
      )
    }
  }

  /*
   * One finding for one non-good answer, with its photos. Shared by a new
   * audit and by Merkez Ekip's edit of a carried-out one (#12), so the two
   * write the same row.
   */
  const createFindingForAnswer = async (ans: QuestionAnswer, auditId: string, detectedDate: string) => {
    const q = questions.find((qq) => qq.id === ans.questionId)
    if (!q) return

    const description = buildFindingDescriptionFromAnswer(ans, q, header.teamName)
    const effectiveLocationName =
      ans.locationName?.trim() || header.department.trim() || 'Bilinmeyen Lokasyon'

    const responsible2 = locationResponsibleMap.get(normLoc(effectiveLocationName)) ?? null

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
        payload: {
          audit_id: auditId,
          question_id: ans.questionId,
          step_code: q.stepCode,
          auditor_user_id: currentUserId || undefined,
          client_finding_id: genUUID(),
          detected_date: detectedDate,
          location_name: effectiveLocationName,
          finding_type: ans.findingType!,
          description,
          action_to_take: ans.actionToTake?.trim(),
          due_date: ans.dueDate || undefined,
          responsible_name: responsible2?.userName || header.auditorName,
          responsible_user_id: responsible2?.userId || undefined,
          auditor_name: header.auditorName.trim(),
          form_title: auditTitle(),

          photo_before_files: beforeArr,
          photo_before_file_id: primary?.fileId,
          photo_before_url: primary?.fileUrl,
        },
      })
    } catch (err) {
      console.error('ADD_FIVE_S_FINDING error', err)
    }
  }

  /*
   * #12: save Merkez Ekip's correction of a carried-out audit. The audit row
   * gets the recomputed scores, each answer row its new rating, and an answer
   * newly rated below "İyi" gets its finding. The plan's status is not
   * touched (it was stamped when the audit was sent); its attendance record
   * only when the editor changed the tick.
   *
   * Runs under handleSubmit's in-flight lock (its only caller), which stays
   * held through every write here; true once the correction is saved.
   */
  const submitAuditEdit = async (target: NonNullable<typeof editAudit>): Promise<boolean> => {
    const A = actions as any
    const { S1, S2, S3, S4, S5 } = stepScores
    try {
      await startAsPromise(A[AUDIT_KEYS.PATCH]?.start, {
        payload: {
          _id: target.id,
          auditor_name: header.auditorName.trim(),
          total_score: totalScore.toFixed(2),
          score_s1: (S1 ?? 0).toFixed(2),
          score_s2: (S2 ?? 0).toFixed(2),
          score_s3: (S3 ?? 0).toFixed(2),
          score_s4: (S4 ?? 0).toFixed(2),
          score_s5: (S5 ?? 0).toFixed(2),
        },
      })
    } catch (err: any) {
      const reasons = serverReasonsOf(err)
      toast.error(reasons.length ? `Denetim güncellenemedi: ${reasons.join(' ')}` : 'Denetim güncellenemedi.')
      return false
    }

    /*
     * The attendance tick decides the score, so a corrected tick goes to the
     * plan too — but only a tick the editor actually changed. Written on every
     * save, it replaced the plan's record with whatever the box showed, and
     * the box of an audit from before the tick shows a default, not a fact.
     */
    const tickChanged =
      locationHasFieldManager && (header.fieldManagerAttended === true) !== target.initialFieldManagerAttended
    if (assignedPlan?.id && tickChanged) {
      const startPlan = safeStart(A, planUpdateKey)
      if (startPlan) {
        await startAsPromise(startPlan, {
          payload: { _id: assignedPlan.id, field_manager_attended: header.fieldManagerAttended === true },
        }).catch((err: unknown) => console.error('plan attendance not updated', err))
      }
    }

    const answeredAt = new Date().toISOString()
    const results = await Promise.allSettled(
      questions
        .filter((q) => !!answers[q.id]?.rating)
        .map((q) => {
          const ans = answers[q.id]!
          const fields = {
            rating: ans.rating,
            explanation: ans.explanation?.trim() || null,
            finding_type: ans.findingType || null,
            has_open_finding:
              ans.rating !== 'good' && (!!ans.findingType || openFindingsByQuestion.has(q.id)),
          }
          const existing = target.answerIdByQuestion.get(q.id)
          return existing
            ? startAsPromise(A[ANSWER_KEYS.PATCH]?.start, { payload: { _id: existing, ...fields } })
            : startAsPromise(A[ANSWER_KEYS.ADD]?.start, {
              payload: {
                audit_id: target.id,
                question_id: q.id,
                step_code: q.stepCode,
                answered_at: answeredAt,
                ...fields,
              },
            })
        })
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) toast.error(`${failed} soru yanıtı güncellenemedi.`)

    const newFindings = questions
      .map((q) => answers[q.id])
      .filter((ans): ans is QuestionAnswer => !!ans && needsFindingDetails(ans.questionId, ans) && !!ans.findingType)
    await Promise.all(newFindings.map((ans) => createFindingForAnswer(ans, target.id, header.date)))

    toast.success('Denetim güncellendi.')
    window.location.href = '/'
    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // See submitLockRef: one save at a time, and none after one went through.
    if (submitLockRef.current) return
    submitLockRef.current = true
    setSubmitState('saving')
    let done = false
    try {
      done = await submitForm()
    } finally {
      if (done) {
        setSubmitState('done')
      } else {
        submitLockRef.current = false
        setSubmitState('idle')
      }
    }
  }

  /** The form's save; true once the audit went through (sent, corrected, or queued). */
  const submitForm = async (): Promise<boolean> => {
    setHasAttempted(true)

    const missing = new Set<string>()

    if (!header.teamName || !header.department || !header.date) {
      toast.error('Ekip, Lokasyon ve Tarih alanları plan üzerinden otomatik gelmelidir.')
      return false
    }
    if (!header.auditorName) {
      toast.error('Denetimi Yapan alanı zorunludur.')
      return false
    }

    for (const q of questions) {
      const ans = answers[q.id]
      if (!ans || !ans.rating) {
        missing.add(q.id)
        continue
      }

      // Same rule as liveUnanswered: an answer a correction did not touch is not re-checked.
      if (isUnchangedStoredAnswer(q.id, ans.rating)) continue

      if (isExplanationRequired(q, ans) && !ans.explanation.trim()) missing.add(q.id)

      if (needsFindingDetails(q.id, ans)) {
        if (!ans.findingType) missing.add(q.id)
        if (!ans.actionToTake?.trim()) missing.add(q.id)
        if (!ans.dueDate) missing.add(q.id)
        const loc = (ans.locationName?.trim() || header.department || '').trim()
        if (!loc) missing.add(q.id)
      }
    }

    if (missing.size > 0) {
      setMissingQuestions(new Set(missing))
      return false
    }

    setMissingQuestions(new Set())

    // The rule scores the audit 0 without the tick; make sure that is meant.
    // Not asked where the location has no field manager: the rule does not apply.
    if (locationHasFieldManager && header.fieldManagerAttended !== true) {
      const ok = await confirmDialog({
        title: 'Bölge sorumlusu katılmadı olarak kaydedilecek',
        message:
          '"Bölge sorumlusu denetime katıldı" işaretli değil. Kurala göre denetim puanı 0 olarak kaydedilecek. Devam edilsin mi?',
        confirmLabel: 'Yine de kaydet',
        cancelLabel: 'Vazgeç',
        tone: 'danger',
      })
      if (!ok) return false
    }

    // Madde 1: Açık bulgusu olan sorular "İyi" işaretlendiyse denetçiyi uyar
    const goodButOpen = questions.filter(
      (q) => openFindingsByQuestion.has(q.id) && answers[q.id]?.rating === 'good'
    )
    if (goodButOpen.length > 0) {
      const ok = await confirmDialog({
        title: 'Kapanmamış bulgu varken "İyi" seçildi',
        message:
          'Aşağıdaki sorularda henüz kapanmamış bulgular var. Yine de denetimi bu haliyle kaydetmek istiyor musunuz?',
        items: goodButOpen.map((q) => `${q.id}: ${q.text.slice(0, 60)}`),
        confirmLabel: 'Yine de kaydet',
        tone: 'danger',
      })
      if (!ok) return false
    }

    if (editAudit) {
      return await submitAuditEdit(editAudit)
    }

    // offline ise direkt queue
    if (!isOnline) {
      return await enqueueAuditAndFindingsFromForm()
    }

    const { S1, S2, S3, S4, S5 } = stepScores

    /*
     * The audit row first, then — awaited, under the same lock — its answers,
     * findings and plan stamp. They used to run in an onAfterHandle that
     * nothing waited for, so the save "finished" while they were still being
     * written.
     *
     * The row carries a client_submission_id, the same one the offline queue
     * gets if this attempt seems to fail: a request that timed out after the
     * server had saved it is then found again by the replay instead of being
     * filed as a second audit.
     */
    const clientSubmissionId = genUUID()
    let data: any
    try {
      data = await startAsPromise((actions as any).ADD_FIVE_S_AUDIT?.start, {
        payload: {
          department_name: header.department.trim(),
          auditor_name: header.auditorName.trim(),
          audit_date: atUtcMidnight(header.date),

          total_score: totalScore.toFixed(2),
          target_score: TARGET_SCORE.toFixed(2),

          score_s1: (S1 ?? 0).toFixed(2),
          score_s2: (S2 ?? 0).toFixed(2),
          score_s3: (S3 ?? 0).toFixed(2),
          score_s4: (S4 ?? 0).toFixed(2),
          score_s5: (S5 ?? 0).toFixed(2),

          plan_id: assignedPlan?.id ?? undefined,
          location_id: assignedPlan?.location_id ?? undefined,
          auditor_id: currentUserId || undefined,
          client_submission_id: clientSubmissionId,
        },
      })
    } catch (err) {
      /*
       * A refusal is not a lost connection. Anything the server turned down
       * on purpose (4xx: a rule such as #27, or a 409 for a plan whose audit
       * was already sent) went into the offline queue too, which then retried
       * it forever and told the auditor "kuyruğa eklendi". (This check could
       * never fire before startAsPromise carried the status; see
       * apiCallError.) 401/408/429/5xx and no answer are passing conditions
       * and still go to the queue.
       */
      if (isRefusal(err)) {
        const reasons = serverReasonsOf(err)
        toast.error(reasons.length ? reasons.join(' ') : 'Denetim kaydedilemedi.')
        return false
      }
      console.error('ADD_FIVE_S_AUDIT failed -> offline queue', err)
      return await enqueueAuditAndFindingsFromForm(clientSubmissionId)
    }

    // The audit exists from here on: whatever happens next, the form stays locked.
    try {
      await finishSentAudit(data)
    } catch (err) {
      console.error('Audit saved; a later step failed', err)
      toast.error('Denetim kaydedildi ancak sonraki adımlarda hata oluştu. Lütfen yöneticinize bildirin.')
    }
    return true
  }

  /** What follows a saved audit row: its answers, findings, draft cleanup and plan stamp. */
  const finishSentAudit = async (data: any) => {
    const auditId = data?.data?.id ?? data?.id ?? data?.data?.[0]?.id ?? null

    if (!auditId) {
      console.warn('Audit ID bulunamadı, findings kaydı atlanıyor.')
      setSubmitted(true)
      return
    }

    /*
     * Per-question answers.
     *
     * The audit row keeps only the five step totals, and a finding is
     * written only for a non-good answer. That left every "İyi" with no
     * record at all: after a completed audit nothing could say what was
     * answered for a given question, and the score could not be
     * recomputed from its parts. `five_s_audit_answers` was designed for
     * exactly this (rating / explanation / finding_type per question) and
     * was never written to. It is supplementary to the audit itself, so a
     * failure here reports but does not fail the submission. The rows are
     * the ones the offline queue stores and replays (answerRowsFor).
     */
    const answeredAt = new Date().toISOString()
    const answerJobs = answerRowsFor(questions, answers, (qid) => openFindingsByQuestion.has(qid), answeredAt).map(
      (row) =>
        startAsPromise((actions as any).ADD_FIVE_S_AUDIT_ANSWER?.start, {
          payload: { audit_id: auditId, ...row },
        })
    )

    const answerResults = await Promise.allSettled(answerJobs)
    const failedAnswers = answerResults.filter((r) => r.status === 'rejected')
    if (failedAnswers.length > 0) {
      console.error('Soru yanıtları kaydedilemedi', failedAnswers)
      toast.error(
        `${failedAnswers.length} soru yanıtı kaydedilemedi. Denetim kaydedildi, ayrıntı için yöneticinize bildirin.`
      )
    }

    const nonGoodAnswers = Object.values(answers).filter((ans) => ans.rating && ans.rating !== 'good')
    if (nonGoodAnswers.length === 0) {
      setSubmitted(true)
      await clearDraft(assignedPlan?.id ?? null, header)

      if (assignedPlan?.id && auditId) {
        await markPlanCompleted(assignedPlan.id, auditId)
      }

      // Madde 9: otomatik yeni denetime geçiş yok — ana sayfaya dön
      if (typeof window !== 'undefined') {
        toast.success('Denetim başarıyla kaydedildi.')
        window.location.href = '/'
      }
      return
    }

    // A question that already has an open finding gets no second one
    // (Notlar 07.10, satır 3/16), even if a type was picked in its panel.
    const nonGoodWithType = nonGoodAnswers.filter(
      (ans) => !!ans.findingType && needsFindingDetails(ans.questionId, ans)
    )
    const detectedDate = header.date

    const jobs = nonGoodWithType.map((ans) => createFindingForAnswer(ans, auditId, detectedDate))

    await Promise.all(jobs)
    setSubmitted(true)
    await clearDraft(assignedPlan?.id ?? null, header)

    if (assignedPlan?.id && auditId) {
      await markPlanCompleted(assignedPlan.id, auditId)
    }

    console.log('Audit + findings (+ photos) başarıyla kaydedildi.')

    // Madde 9: otomatik yeni denetime geçiş yok — ana sayfaya dön
    if (typeof window !== 'undefined') {
      toast.success('Denetim başarıyla kaydedildi.')
      window.location.href = '/'
    }
  }

  const handleReset = async () => {
    /*
     * Clearing a half-finished audit is destructive and there was nothing
     * between the button and the loss.
     *
     * Measured: a form carrying 40 points of answers was wiped by one click,
     * with no prompt and no undo — and the saved draft went with it. This is
     * the screen an auditor uses while walking the plant, on a phone, with
     * the button next to "Formu Kaydet". Deleting a location asks first; so
     * should this. An untouched form still clears without friction.
     */
    const doluYanit = Object.values(answers).filter(
      (a: any) => a?.rating || (a?.explanation ?? '').trim() || (a?.photos?.length ?? 0) > 0
    ).length
    if (doluYanit > 0) {
      const onay = await confirmDialog({
        title: 'Form temizlensin mi?',
        message: `${doluYanit} soruda girilen yanıt, açıklama ve fotoğraflar silinecek. Kaydedilmiş taslak da silinir; bu işlem geri alınamaz.`,
        confirmLabel: 'Temizle',
        cancelLabel: 'Vazgeç',
        tone: 'danger',
      })
      if (!onay) return
    }

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
    // See singleSaveLockRef: a double tap filed the same single finding twice.
    if (singleSaveLockRef.current) return
    singleSaveLockRef.current = true
    setSingleSaving(true)
    try {
      await saveSingleFinding()
    } finally {
      singleSaveLockRef.current = false
      setSingleSaving(false)
    }
  }

  const saveSingleFinding = async () => {
    const isNoPlanFlow = !assignedPlan
    // The modal's own place and day, not the audit header's (see singleFinding.location).
    const loc = (singleFinding.location || '').trim()
    const findingDate = singleFinding.date

    if (isNoPlanFlow && !canCreateSingleFinding) {
      toast.error('Tekil bulgu girişi için yetkiniz yok.')
      return
    }

    if (!isNoPlanFlow) {
      if (!header.teamName || !header.department || !header.date) {
        toast.error('Tekil bulgu kaydı için ekibinize planlanan bir denetim olmalıdır.')
        return
      }
    }

    if (isNoPlanFlow) {
      if (!loc) { toast.error('Lokasyon alanı zorunludur.'); return }
      if (!findingDate) { toast.error('Tarih alanı zorunludur.'); return }
      if (!header.teamName) setHeader((prev) => ({ ...prev, teamName: 'Content Manager Core Team' }))
    }

    if (!header.auditorName) { toast.error('Tekil bulgu kaydı için Denetimi Yapan zorunludur.'); return }
    /*
     * Inside an audit, a single finding belongs to a question.
     *
     * Customer rule (Notlar 07.10, satır 15): a single finding raised while
     * filling the audit form must name the question it is about — that link is
     * what lets the form stop asking for the same defect again, and what puts
     * the finding on the right line of the report. One raised outside any audit
     * has no question to belong to, so there it stays optional.
     */
    if (!isNoPlanFlow && !singleFinding.linkedQuestionId) {
      toast.error('Denetim sırasında girilen tekil bulgu bir soruya bağlanmalıdır.')
      return
    }
    if (!singleFinding.findingType) { toast.error('Bulgu tipi zorunludur.'); return }
    if (!singleFinding.explanation.trim()) { toast.error('Açıklama zorunludur.'); return }
    if (!singleFinding.actionToTake.trim()) { toast.error('Alınacak faaliyet alanı zorunludur.'); return }
    if (!singleFinding.dueDate) { toast.error('Termin tarihi zorunludur.'); return }

    if (!loc) { toast.error('Lokasyon alanı zorunludur.'); return }
    if (!findingDate) { toast.error('Tarih alanı zorunludur.'); return }

    /*
     * One defect, one finding (R3). The audit form stops asking for a second
     * finding on a question that already has an open one here; this modal
     * made the twin anyway, with no word about it. Same data as the question
     * rows' "⚠ Açık bulgu" — read again when the modal names another place.
     */
    if (singleFinding.linkedQuestionId) {
      const openHere =
        normLoc(loc) === normLoc(header.department)
          ? openFindingsByQuestion
          : mapOpenFindingsByQuestion(await readOpenFindings(loc), queuedQuestionIdsAt(loc))
      const twins = openHere.get(singleFinding.linkedQuestionId) ?? []
      if (twins.length > 0) {
        const ok = await confirmDialog({
          title: 'Bu soruya bağlı açık bulgu var',
          message: `${singleFinding.linkedQuestionId} sorusunun ${loc} lokasyonunda henüz kapanmamış bulgusu var. Aynı sorun için ikinci bir bulgu açılsın mı?`,
          items: twins,
          confirmLabel: 'Yine de kaydet',
          cancelLabel: 'Vazgeç',
          tone: 'danger',
        })
        if (!ok) return
      }
    }

    // offline ise: audit + single finding kuyruğa
    if (!isOnline) {
      const submissionId = makeUid('sub')
      const planId = assignedPlan?.id ?? null

      const submission: OfflineAuditSubmission = {
        id: submissionId,
        createdAt: Date.now(),
        planId,
        header: { ...header, department: loc, date: findingDate },
        auditPayload: {
          department_name: loc,
          auditor_name: header.auditorName.trim(),
          audit_date: findingDate,
          // Not an audit: the carrier row a single finding needs. See below.
          source: 'single_finding',
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
            question_id: singleFinding.linkedQuestionId || null,
            step_code: singleFinding.linkedQuestionId
              ? singleFinding.linkedQuestionId.split('-')[0]
              : null,
            auditor_user_id: currentUserId || null,
            client_finding_id: genUUID(),
            detected_date: findingDate,
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
            form_title: SINGLE_FINDING_TITLE,
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

      // Same as the audit form: a failed queue write must not read as saved.
      try {
        await enqueueSubmission(submission, photoRows)
      } catch (err) {
        console.error('offline enqueue (single finding) failed', err)
        toast.error(offlineSaveFailedText(err))
        return
      }

      toast.success('Offline: Tekil bulgu kuyruğa eklendi. İnternet gelince otomatik gönderilecek.')
      setSingleFindingOpen(false)
      setSingleFinding({ findingType: '', explanation: '', photos: [], actionToTake: '', dueDate: '', linkedQuestionId: '', location: '', date: '' })
      return
    }

    // online: mevcut akış — every step awaited, under the save lock
    let data: any
    try {
      data = await startAsPromise((actions as any).ADD_FIVE_S_AUDIT?.start, {
        payload: {
          department_name: loc,
          auditor_name: header.auditorName.trim(),
          audit_date: atUtcMidnight(findingDate),
          /*
           * A finding is stored against an audit row, so a single finding gets
           * one — with every score at 0. That row is a carrier, not an audit,
           * and nothing said so: it was counted as a completed audit ("2
           * tamamlanan görünüyor ama listede 1", Notlar 07.10 satır 24) and its
           * 0.00 was averaged into every score report. `source` marks it so
           * both can leave it out.
           */
          source: 'single_finding',

          total_score: '0.00',
          target_score: TARGET_SCORE.toFixed(2),

          score_s1: '0.00',
          score_s2: '0.00',
          score_s3: '0.00',
          score_s4: '0.00',
          score_s5: '0.00',
        },
      })
    } catch (err) {
      console.error('TEKİL BULGU audit error', err)
      // A refusal says why; anything else may be the connection.
      const reasons = isRefusal(err) ? serverReasonsOf(err) : []
      toast.error(
        reasons.length
          ? `Tekil bulgu kaydedilemedi: ${reasons.join(' ')}`
          : 'Kayıt sırasında hata oluştu. İnternet sorunu olabilir. Tekrar deneyin veya offline kuyruğa ekleyin.'
      )
      return
    }

    const auditId = data?.data?.id ?? data?.id ?? data?.data?.[0]?.id ?? null
    if (!auditId) {
      toast.error('Tekil bulgu için audit kaydı oluşturulamadı.')
      return
    }

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
        payload: {
          audit_id: auditId,
          question_id: singleFinding.linkedQuestionId || undefined,
          step_code: singleFinding.linkedQuestionId
            ? singleFinding.linkedQuestionId.split('-')[0]
            : undefined,
          auditor_user_id: currentUserId || undefined,
          client_finding_id: genUUID(),
          detected_date: findingDate,
          location_name: loc || 'Bilinmeyen Lokasyon',
          finding_type: singleFinding.findingType,
          description,
          responsible_name: singleLocResp?.userName || header.auditorName,
          responsible_user_id: singleLocResp?.userId || undefined,
          action_to_take: singleFinding.actionToTake.trim(),
          due_date: singleFinding.dueDate || undefined,
          auditor_name: header.auditorName.trim(),
          form_title: SINGLE_FINDING_TITLE,

          photo_before_files: beforeArr,
          photo_before_file_id: primary?.fileId,
          photo_before_url: primary?.fileUrl,
        },
      })

      toast.success('Tekil bulgu başarıyla kaydedildi.')
      setSingleFindingOpen(false)
      setSingleFinding({ findingType: '', explanation: '', photos: [], actionToTake: '', dueDate: '', linkedQuestionId: '', location: '', date: '' })
      fetchFindings(header.department)
    } catch (err) {
      console.error('TEKİL BULGU ADD_FIVE_S_FINDING error', err)
      const reasons = isRefusal(err) ? serverReasonsOf(err) : []
      toast.error(
        reasons.length
          ? `Tekil bulgu kaydedilemedi: ${reasons.join(' ')}`
          : 'Tekil bulgu kaydedilirken bir hata oluştu.'
      )
    }
  }

  const singleFindingModal = singleFindingOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl md:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tekil Bulgu Girişi</h3>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              {assignedPlan
                ? 'Denetim sırasında ek tekil bulgu kaydedebilirsiniz. Denetim formundan girilen tekil bulgu bir soruya bağlanmalıdır.'
                : 'Denetim planı olmasa bile (sadece yetkili rol) tekil bir 5S bulgusunu burada kaydedebilirsiniz.'}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Durum:{' '}
              <span className={isOnline ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {queuedCount > 0 ? <span className="ml-2">• Kuyruk: {queuedCount}</span> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={closeSingleFindingModal}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
              Denetimi Yapan <span className="text-rose-400">(zorunlu)</span>
            </label>
            <input
              type="text"
              value={header.auditorName}
              onChange={(e) => handleHeaderChange('auditorName', e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
              placeholder="İsim Soyisim"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Ekip</label>
            <input
              type="text"
              value={header.teamName || 'Content Manager Core Team'}
              readOnly
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 opacity-90"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                Lokasyon <span className="text-rose-400">(zorunlu)</span>
              </label>

              <select
                value={singleFinding.location}
                onChange={(e) => handleSingleFindingPlaceChange('location', e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
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
              {/*
               * The person who will close it, shown as soon as the place is
               * known (Notlar 07.10, satır 18). It was already written to the
               * finding from the location's field manager, but nothing on the
               * screen said who that was, so whoever raised it could not tell
               * whether it would reach anyone.
               */}
              {singleFinding.location ? (
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Saha Sorumlusu:{' '}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {locationResponsibleMap.get(normLoc(singleFinding.location))?.userName ||
                      'Bu lokasyona saha sorumlusu tanımlı değil'}
                  </span>
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                Tarih <span className="text-rose-400">(zorunlu)</span>
              </label>
              <DateInput
                value={singleFinding.date}
                onChange={(value) => handleSingleFindingPlaceChange('date', value)}
                className="date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
              Bulgu Tipi <span className="text-rose-400">(zorunlu)</span>
            </label>
            <select
              value={singleFinding.findingType}
              onChange={(e) => handleSingleFindingFieldChange('findingType', e.target.value as FindingType | '')}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
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
            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
              Bağlı Soru{' '}
              {assignedPlan ? (
                <span className="text-rose-400">(zorunlu)</span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">(opsiyonel)</span>
              )}
            </label>
            <select
              value={singleFinding.linkedQuestionId}
              onChange={(e) => handleSingleFindingFieldChange('linkedQuestionId', e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
            >
              <option value="">
                {assignedPlan ? 'Seçiniz' : 'Seçiniz (bağlamak istemiyorsanız boş bırakın)'}
              </option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.id} — {q.text.length > 80 ? q.text.slice(0, 80) + '…' : q.text}
                </option>
              ))}
            </select>
            {singleFindingLinkedOpen.length > 0 ? (
              <p className="mt-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-900 dark:text-amber-300">
                ⚠ Bu soruya bu lokasyonda henüz kapanmamış bulgu var ({singleFindingLinkedOpen.join(', ')}). Aynı
                sorun için ikinci bir bulgu açmak üzeresiniz; kaydederken onayınız istenecek.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
              Açıklama <span className="text-rose-400">(zorunlu)</span>
            </label>
            <textarea
              rows={3}
              value={singleFinding.explanation}
              onChange={(e) => handleSingleFindingFieldChange('explanation', e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
              placeholder="Kısa açıklama girin..."
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Fotoğraflar</label>

            <div className="flex items-center gap-2">
              <label className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-md border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950/70 px-3 py-1.5 text-[11px] hover:bg-slate-200 hover:dark:bg-slate-800">
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
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 px-2 py-1"
                  >
                    <span className="truncate text-[11px] text-slate-700 dark:text-slate-300">
                      {i + 1}. {f.name}
                    </span>
                    <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => viewLocalPhoto(f)}
                      className="rounded-md border border-sky-700/50 px-2 py-0.5 text-[11px] text-sky-700 dark:text-sky-300 hover:bg-sky-100 hover:dark:bg-sky-950/40"
                    >
                      Görüntüle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSingleFindingPhotoRemove(i)}
                      className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-[11px] text-slate-800 dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800"
                    >
                      Sil
                    </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Henüz fotoğraf eklenmedi.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
              Alınacak Faaliyet <span className="text-rose-400">(zorunlu)</span>
            </label>
            <select
              value={singleFinding.actionToTake}
              onChange={(e) =>
                handleSingleFindingFieldChange('actionToTake', e.target.value as ActionToTake | '')
              }
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
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
            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
              Termin Tarihi <span className="text-rose-400">(zorunlu)</span>
            </label>
            <DateInput
              value={singleFinding.dueDate || singleFinding.date}
              onChange={(value) => handleSingleFindingFieldChange('dueDate', value)}
              className="date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={closeSingleFindingModal}
            className="rounded-md border border-slate-400 dark:border-slate-600 px-4 py-1.5 text-slate-800 dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSingleFindingSave}
            disabled={singleSaving}
            className="rounded-md bg-emerald-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {singleSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )

  /* ───────────────────────────── Render ───────────────────────────── */
  if (assignmentLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 text-sm text-slate-700 dark:text-slate-300">
          Planlanan denetimler kontrol ediliyor...
        </div>
      </div>
    )
  }

  if (planSelectionMode && availablePlans.length > 0) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-4 py-10 md:px-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Denetim Seç</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isOwnTeamSelection
              ? 'Ekibinize atanmış birden fazla planlı denetim var. Lütfen hangi denetimi yapacağınızı seçin.'
              : 'Ekibinize atanmış planlı bir denetim yok. Yetkiniz olduğu için açık denetimlerin tamamı aşağıda listeleniyor.'}
          </p>

          <div className="mt-5 space-y-3">
            {availablePlans.map((p) => {
              const meta = planMetaMap[p.id] ?? { locationName: '-', teamName: '-' }
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPlan(p)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/50 px-4 py-3 text-left hover:border-sky-500/60 hover:bg-sky-500/5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{meta.locationName || 'Bilinmeyen Lokasyon'}</div>
                      <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        Ekip: <span className="text-slate-700 dark:text-slate-300">{meta.teamName || '-'}</span>
                        {' · '}
                        Tarih: <span className="text-slate-700 dark:text-slate-300">{p.planned_date || '-'}</span>
                      </div>
                    </div>
                    <span className="text-xs text-sky-700 dark:text-sky-400">Seç →</span>
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
  // An audit being edited is shown even when its plan has since been deleted.
  if (!assignedPlan && !editAudit) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-4 py-10 md:px-8">
        {LocationsDatalist}

        <div className="mx-auto max-w-3xl rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Ekibinize planlanan bir denetim yok</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Planlama ekranından ekibinize bir denetim planlandığında bu form otomatik açılacaktır.
              </div>

              <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                Durum:{' '}
                <span className={isOnline ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {queuedCount > 0 ? (
                  <span className="ml-2 text-slate-500 dark:text-slate-400">• Kuyruk: {queuedCount}</span>
                ) : null}
              </div>
              {RefusedQueueNotice}
            </div>

            {queuedCount > 0 ? (
              <button
                type="button"
                onClick={syncOfflineQueue}
                disabled={!isOnline || syncing}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-3 py-2 text-[11px] hover:bg-slate-100 hover:dark:bg-slate-950 disabled:opacity-50"
              >
                {syncing ? 'Senkron...' : `Senkronla (${queuedCount})`}
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={fetchAssignment}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-3 py-2 text-xs hover:bg-slate-100 hover:dark:bg-slate-950"
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

        {singleFindingModal}

        {/* Bulgu Detay Modal */}
        {activeFinding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bulgu Detayı</h3>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    {String(activeFinding.finding_type ?? '-')} • {String(activeFinding.detected_date ?? '-')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFinding(null)}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-800 dark:text-slate-200">
                <div className="rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-3 whitespace-pre-wrap">
                  {activeFinding.description || '-'}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Termin:</span> {String(activeFinding.due_date ?? '-')}
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Sorumlu:</span> {String(activeFinding.responsible_name ?? '-')}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400">Lokasyon:</span> {String(activeFinding.location_name ?? '-')}
                  </div>
                </div>

                {getBeforePhotoResolvedUrls(activeFinding).length > 0 ? (
                  <div className="rounded-md border border-slate-300 dark:border-slate-800 bg-slate-950/30 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200">Öncesi Fotoğraflar</div>
                    <div className="grid grid-cols-3 gap-2">
                      {getBeforePhotoResolvedUrls(activeFinding).map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          onClick={() => setPreviewUrl(url)}
                          className="group relative overflow-hidden rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 hover:border-slate-400 hover:dark:border-slate-600"
                          title="Büyüt"
                        >
                          <img
                            src={url}
                            alt={`before-${idx + 1}`}
                            className="h-20 w-full object-cover transition-transform group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-slate-900 dark:text-slate-100">
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">Fotoğrafa tıklayınca büyür.</div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Öncesi fotoğraf yok.</div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveFinding(null)}
                  className="rounded-md border border-slate-400 dark:border-slate-600 px-4 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800"
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
                className="absolute -top-10 right-0 rounded-md border border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 hover:bg-white hover:dark:bg-slate-900"
              >
                ✕ Kapat
              </button>

              <img
                src={previewUrl}
                alt="preview"
                className="max-h-[80vh] w-full rounded-xl border border-slate-300 dark:border-slate-700 object-contain bg-slate-100 dark:bg-slate-950"
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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-4 py-6 md:px-8">
      {LocationsDatalist}

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="border-b border-slate-300 dark:border-slate-800 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold md:text-2xl">
                {editAudit ? '5S Denetim Formu — Düzenleme' : '5S Denetim Formu (Sahalar)'}
              </h1>
              {editAudit ? (
                <p className="mt-2 rounded-md border border-indigo-400/60 bg-indigo-100 dark:bg-indigo-950/30 px-3 py-2 text-[11px] text-indigo-800 dark:text-indigo-200">
                  Tamamlanmış bir denetimi düzenliyorsunuz. Kaydettiğinizde puanlar ve yanıtlar bu denetimin
                  üzerine yazılır; yeni bir denetim açılmaz.
                  {!editAudit.hadAnswers
                    ? ' Bu denetimin soru yanıtları kaydedilmemiş (eski kayıt); yanıtları yeniden girerek puanı düzeltebilirsiniz.'
                    : ''}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Minimum hedef puan: <span className="font-semibold text-emerald-700 dark:text-emerald-300">75</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Plan: <span className="text-slate-700 dark:text-slate-300">{header.teamName}</span> •{' '}
                <span className="text-slate-700 dark:text-slate-300">{header.department}</span> •{' '}
                <span className="text-slate-700 dark:text-slate-300">{planDate || header.date}</span>
                {planDate && planDate !== header.date ? (
                  <span className="ml-1 text-slate-600 dark:text-slate-400">
                    (denetim {header.date} tarihinde yapılıyor)
                  </span>
                ) : null}
              </p>
              <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                Durum:{' '}
                <span className={isOnline ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {queuedCount > 0 ? <span className="ml-2 text-slate-500 dark:text-slate-400">• Kuyruk: {queuedCount}</span> : null}
                {queuedCount > 0 ? (
                  <button
                    type="button"
                    onClick={syncOfflineQueue}
                    disabled={!isOnline || syncing}
                    className="ml-3 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-2 py-1 text-[11px] hover:bg-slate-100 hover:dark:bg-slate-950 disabled:opacity-50"
                  >
                    {syncing ? 'Senkron...' : 'Senkronla'}
                  </button>
                ) : null}
              </p>
              {RefusedQueueNotice}
            </div>

            <div className="flex flex-col gap-2 items-stretch md:items-end">
              {canCreateSingleFinding && !editAudit && (
                <button
                  type="button"
                  onClick={openSingleFindingModal}
                  className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Tekil Bulgu +
                </button>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex flex-col items-start gap-1 rounded-xl bg-white dark:bg-slate-900/70 px-4 py-3 text-sm sm:items-end">
                  <span className="text-slate-600 dark:text-slate-400">Toplam Puan</span>
                  {/*
                    Measured on the light theme: amber-400 on the white score
                    card came out at 1.72:1, against 3:1 for large bold text —
                    the number the whole form exists to produce was the least
                    readable thing on it.
                  */}
                  <span
                    className={`text-2xl font-bold ${
                      totalScore >= 75
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {formatScore(totalScore)} / 100
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{totalScore >= 75 ? 'Hedef üstü' : 'Hedef altında'}</span>
                  {auditScore.adjustments.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                      {auditScore.adjustments.map((a) => (
                        <li key={a}>• {a}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </header>

        {FindingsPanel}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4 shadow-xl shadow-slate-950/60 md:p-6"
        >
          {/* Genel Bilgiler */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Genel Bilgiler</h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Ekip, lokasyon ve tarih plan üzerinden otomatik gelir.</p>
            </div>

            <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Ekip</label>
                <input
                  type="text"
                  value={header.teamName}
                  readOnly
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 opacity-90"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Lokasyon</label>
                <input
                  type="text"
                  value={header.department}
                  readOnly
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 opacity-90"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Denetimi Yapan</label>
                {teamMemberOptions.length > 0 ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAuditorMenuOpen((o) => !o)}
                      className="flex w-full items-center justify-between rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-left text-sm outline-none focus:border-sky-400"
                    >
                      <span className={selectedAuditors.length ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}>
                        {selectedAuditors.length ? selectedAuditors.join(', ') : 'Seçiniz'}
                      </span>
                      <span className="ml-2 text-slate-500 dark:text-slate-400">▾</span>
                    </button>
                    {auditorMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setAuditorMenuOpen(false)} />
                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                          {teamMemberOptions.map((m) => (
                            <label
                              key={m.id}
                              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-200 hover:dark:bg-slate-800"
                            >
                              <input
                                type="checkbox"
                                checked={selectedAuditors.includes(m.name)}
                                onChange={() => toggleAuditor(m.name)}
                                className="accent-emerald-500"
                              />
                              <span>{m.name}</span>
                            </label>
                          ))}
                          {/*
                            #29 (Foto 8): someone outside the planned team can
                            join the audit. The list offered the team only, so
                            a stand-in auditor could not be recorded at all.
                          */}
                          <div className="border-t border-slate-300 dark:border-slate-700 p-2">
                            <div className="mb-1 text-[11px] text-slate-600 dark:text-slate-400">Ekip dışından kişi ekle</div>
                            <div className="flex gap-1">
                              <select
                                value={extraAuditorId}
                                onChange={(e) => setExtraAuditorId(e.target.value)}
                                className="min-w-0 flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1 text-xs"
                              >
                                <option value="">Kişi seçin</option>
                                {/*
                                  Not the location's own field managers: nobody
                                  audits the place they are responsible for
                                  (#27), and this list offered them as
                                  "ekip dışından" auditors of their own place.
                                */}
                                {[...assignmentDataRef.current.usersById.entries()]
                                  .filter(([id, name]) => !teamMemberOptions.some((m) => m.id === id || m.name === name))
                                  .filter(
                                    ([id]) =>
                                      !(
                                        assignmentDataRef.current.fieldManagerIdsByLoc.get(normLoc(header.department)) ?? []
                                      ).includes(id)
                                  )
                                  .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
                                  .map(([id, name]) => (
                                    <option key={id} value={id}>
                                      {name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                disabled={!extraAuditorId}
                                onClick={() => {
                                  const name = assignmentDataRef.current.usersById.get(extraAuditorId)
                                  if (!name) return
                                  setTeamMemberOptions((prev) =>
                                    prev.some((m) => m.id === extraAuditorId) ? prev : [...prev, { id: extraAuditorId, name }]
                                  )
                                  if (!selectedAuditors.includes(name)) toggleAuditor(name)
                                  setExtraAuditorId('')
                                }}
                                className="rounded-md border border-emerald-700/60 bg-emerald-100 dark:bg-emerald-950/30 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200 disabled:opacity-50"
                                aria-label="Kişiyi denetçilere ekle"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={header.auditorName}
                    onChange={(e) => handleHeaderChange('auditorName', e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-sm outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    placeholder="İsim Soyisim"
                  />
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Denetime aktif katılan denetçileri seçin (birden fazla seçilebilir).</p>
              </div>

              {/*
                Kurallar (Notlar 07.10): the auditor ticks whether the
                location's field manager took part. Not ticked, the audit
                scores 0 — the plant's rule, applied by scoreAudit.
              */}
              <div className="space-y-1 sm:col-span-2">
                {locationHasFieldManager ? (
                  <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={header.fieldManagerAttended === true}
                      onChange={(e) => setHeader((prev) => ({ ...prev, fieldManagerAttended: e.target.checked }))}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">Bölge sorumlusu denetime katıldı</span>
                      {locationResponsibleMap.get(normLoc(header.department))?.userName ? (
                        <span className="text-slate-600 dark:text-slate-400">
                          {' '}({locationResponsibleMap.get(normLoc(header.department))?.userName})
                        </span>
                      ) : null}
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        İşaretlenmezse denetim puanı 0 olarak kaydedilir.
                      </span>
                    </span>
                  </label>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bu lokasyona saha sorumlusu tanımlı değil; bölge sorumlusu katılım kuralı uygulanmaz.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Tarih</label>
                <input
                  type="date"
                  value={header.date}
                  readOnly
                  className="date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 opacity-90"
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
              <section key={step.code} className="rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                <div className="flex flex-col gap-3 border-b border-slate-300 dark:border-slate-800 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Maksimum Puan: {step.maxScore.toFixed(2)}</p>
                  </div>

                  <div className="flex flex-col items-start gap-1 md:items-end">
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Adım Puanı:</span>
                      <span className="font-semibold text-sky-700 dark:text-sky-300">
                        {formatScore(stepScore)} / {step.maxScore.toFixed(2)}
                      </span>
                    </div>

                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${stepRatio >= 0.75 ?'bg-emerald-400' : stepRatio >= 0.5 ? 'bg-amber-400' : 'bg-rose-500'
                          }`}
                        style={{ width: `${Math.min(stepRatio * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop TABLE */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-800 dark:text-slate-200">
                      <thead className="bg-slate-50 dark:bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
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
                          const point = rating != null ? q.maxScore * RATING_FACTOR[rating] : undefined
                          const isMissing = hasAttempted && liveUnanswered.has(q.id)

                          return (
                            <tr key={q.id} className={`border-t border-slate-300 dark:border-slate-800/80 align-top ${isMissing ?'bg-rose-200 dark:bg-rose-950/40 border-l-4 border-l-rose-500' : ''}`}>
                              <td className="px-4 py-2 text-[11px] text-slate-600 dark:text-slate-400">
                                {step.order}.{q.order}
                              </td>

                              <td className="px-4 py-2 text-xs">
                                <span className={isMissing ? 'font-semibold text-rose-700 dark:text-rose-200' : ''}>{q.text}</span>
                                {isMissing && (
                                  <span className="ml-2 inline-flex items-center rounded-sm bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-rose-400 ring-1 ring-rose-500/40">
                                    ⚠ Yanıt Gerekli
                                  </span>
                                )}
                                {openFindingsByQuestion.has(q.id) && (
                                  <span
                                    className="ml-2 inline-flex items-center rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-300 ring-1 ring-amber-500/40"
                                    title="Bu soruya bağlı henüz kapanmamış bulgu var"
                                  >
                                    ⚠ Açık bulgu {openFindingsByQuestion.get(q.id)?.join(', ')}
                                  </span>
                                )}
                              </td>

                              {hasAnyDetails && (
                                <td className="px-4 py-2">
                                  {rating !== 'good' && (
                                    <button
                                      type="button"
                                      onClick={() => openDetailModal(q.id)}
                                      className="inline-flex items-center rounded-md border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950/70 px-2 py-1 text-[11px] hover:bg-slate-200 hover:dark:bg-slate-800"
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
                                      className="h-3 w-3 border-slate-500 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 focus:ring-sky-500"
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
                                      className="h-3 w-3 border-slate-500 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 focus:ring-sky-500"
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
                                      className="h-3 w-3 border-slate-500 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 focus:ring-sky-500"
                                    />
                                    <span>Kötü</span>
                                  </label>
                                </div>
                              </td>

                              <td className="px-4 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300">{formatScore(point)}</td>
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
                    const point = rating != null ? q.maxScore * RATING_FACTOR[rating] : undefined
                    const isOpen = expanded[q.id]

                    const ratingLabel =
                      rating === 'good' ? 'İyi' : rating === 'medium' ? 'Orta' : rating === 'bad' ? 'Kötü' : 'Seçilmedi'

                    const isMissingMobile = hasAttempted && liveUnanswered.has(q.id)

                    return (
                      <div key={q.id} className={`px-3 py-2 ${isMissingMobile ?'bg-rose-200 dark:bg-rose-950/40 border-l-4 border-rose-500' : ''}`}>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(q.id)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div className="flex-1">
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              {step.order}.{q.order}
                            </div>
                            <div className="mt-0.5 text-xs">
                              <span className={isMissingMobile ? 'font-semibold text-rose-700 dark:text-rose-200' : 'text-slate-900 dark:text-slate-100'}>{q.text}</span>
                              {isMissingMobile && (
                                <span className="ml-1 inline-flex items-center rounded-sm bg-rose-500/20 px-1 py-0.5 text-[11px] font-semibold text-rose-400">⚠</span>
                              )}
                              {openFindingsByQuestion.has(q.id) && (
                                <span className="ml-1 inline-flex items-center rounded-sm bg-amber-500/20 px-1 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                  ⚠ Açık bulgu {openFindingsByQuestion.get(q.id)?.join(', ')}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 dark:bg-slate-800/80 px-2 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                {ratingLabel}
                              </span>
                              <span className="font-semibold text-sky-700 dark:text-sky-300">{formatScore(point)}</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">/ {q.maxScore.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="ml-2 flex items-center">
                            <span className="mr-1 text-[11px] text-slate-500 dark:text-slate-400">{isOpen ? 'Kapat' : 'Aç'}</span>
                            <span
                              className={`inline-block transform text-slate-600 dark:text-slate-400 transition-transform ${isOpen ?'rotate-90' : 'rotate-0'
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
                                  className="inline-flex items-center rounded-md border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950/70 px-3 py-1.5 text-[11px] hover:bg-slate-200 hover:dark:bg-slate-800"
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
                              <span className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">Değerlendirme</span>
                              <div className="flex flex-wrap gap-3 text-[11px]">
                                <label className="inline-flex items-center gap-1">
                                  <input
                                    type="radio"
                                    name={`${q.id}-mobile`}
                                    value="good"
                                    checked={rating === 'good'}
                                    onChange={() => handleRatingChange(q.id, 'good')}
                                    className="h-3 w-3 border-slate-500 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 focus:ring-sky-500"
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
                                    className="h-3 w-3 border-slate-500 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 focus:ring-sky-500"
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
                                    className="h-3 w-3 border-slate-500 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 focus:ring-sky-500"
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
          <section className="space-y-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Değerlendirme Özeti</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-800 dark:text-slate-200">
                <thead className="bg-slate-50 dark:bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Adım</th>
                    <th className="px-4 py-2">Puan</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => (
                    <tr key={step.code} className="border-t border-slate-300 dark:border-slate-800/80">
                      <td className="px-4 py-2 text-xs">{step.title}</td>
                      <td className="px-4 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
                        {formatScore(stepScores[step.code])}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-700/80">
                    <td className="px-4 py-2 text-xs font-semibold">Toplam (100)</td>
                    <td className="px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">{formatScore(totalScore)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {submitted && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {isOnline ? 'Form başarıyla gönderildi.' : 'Form offline kuyruğa alındı (internet gelince gönderilecek).'}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
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
                    className="inline-flex items-center justify-center rounded-md border border-slate-400 dark:border-slate-600 px-4 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800"
                  >
                    Temizle
                  </button>
                  <button
                    type="submit"
                    disabled={submitState !== 'idle' || (hasAttempted && liveUnanswered.size > 0)}
                    title={hasAttempted && liveUnanswered.size > 0 ? `${liveUnanswered.size} soru yanıtlanmadan form kaydedilemez.` : undefined}
                    className={`inline-flex items-center gap-1.5 justify-center rounded-md px-4 py-2 text-xs font-semibold transition-colors ${ submitState !== 'idle' || (hasAttempted && liveUnanswered.size > 0) ?'cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                    }`}
                  >
                    {submitState === 'saving'
                      ? 'Kaydediliyor…'
                      : submitState === 'done'
                        ? 'Kaydedildi'
                        : editAudit
                          ? 'Değişiklikleri Kaydet'
                          : 'Formu Kaydet'}
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
            <div className="w-full max-w-lg rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {activeQuestion.stepCode} - {activeQuestion.text}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">Orta / Kötü değerlendirmeler için detayları doldurun.</p>
                </div>
                <button type="button" onClick={closeDetailModal} className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200">
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
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
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
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
                  <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                    Açıklama <span className="text-rose-400">(Orta/Kötü için zorunlu)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={activeAnswer.explanation ?? ''}
                    onChange={(e) => handleExplanationChange(activeQuestion.id, e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    placeholder="Kısa açıklama girin..."
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Fotoğraflar</label>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-md border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950/70 px-3 py-1.5 text-[11px] hover:bg-slate-200 hover:dark:bg-slate-800">
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
                          className="flex items-center justify-between gap-2 rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 px-2 py-1"
                        >
                          <span className="truncate text-[11px] text-slate-700 dark:text-slate-300">
                            {i + 1}. {f.name}
                          </span>
                          <span className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => viewLocalPhoto(f)}
                              className="rounded-md border border-sky-700/50 px-2 py-0.5 text-[11px] text-sky-700 dark:text-sky-300 hover:bg-sky-100 hover:dark:bg-sky-950/40"
                            >
                              Görüntüle
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePhotoRemove(activeQuestion.id, i)}
                              className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-[11px] text-slate-800 dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800"
                            >
                              Sil
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Henüz fotoğraf eklenmedi.</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                    Alınacak Faaliyet <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <select
                    value={activeAnswer.actionToTake ?? ''}
                    onChange={(e) =>
                      handleActionToTakeChange(activeQuestion.id, (e.target.value as ActionToTake) || null)
                    }
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
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
                  <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                    Termin Tarihi <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <DateInput
                   
                    value={activeAnswer.dueDate ?? header.date}
                    onChange={(value) => handleDueDateChange(activeQuestion.id,  value)}
                   className="date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
/>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                    Tespit Edildiği Yer <span className="text-rose-400">(zorunlu)</span>
                  </label>
                  <input
                    type="text"
                    list="five-s-location-options"
                    value={activeAnswer.locationName ?? header.department}
                    onChange={(e) => handleLocationChange(activeQuestion.id, e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    placeholder="Örn: Bakım Onarım, Ofis girişi..."
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="rounded-md border border-slate-400 dark:border-slate-600 px-4 py-1.5 text-slate-800 dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800"
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
            <div className="w-full max-w-lg rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bulgu Detayı</h3>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    {String(activeFinding.finding_type ?? '-')} • {String(activeFinding.detected_date ?? '-')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFinding(null)}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-800 dark:text-slate-200">
                <div className="rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-3 whitespace-pre-wrap">
                  {activeFinding.description || '-'}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Termin:</span> {String(activeFinding.due_date ?? '-')}
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Sorumlu:</span> {String(activeFinding.responsible_name ?? '-')}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400">Lokasyon:</span> {String(activeFinding.location_name ?? '-')}
                  </div>
                </div>

                {getBeforePhotoResolvedUrls(activeFinding).length > 0 ? (
                  <div className="rounded-md border border-slate-300 dark:border-slate-800 bg-slate-950/30 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200">Öncesi Fotoğraflar</div>
                    <div className="grid grid-cols-3 gap-2">
                      {getBeforePhotoResolvedUrls(activeFinding).map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          onClick={() => setPreviewUrl(url)}
                          className="group relative overflow-hidden rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 hover:border-slate-400 hover:dark:border-slate-600"
                          title="Büyüt"
                        >
                          <img
                            src={url}
                            alt={`before-${idx + 1}`}
                            className="h-20 w-full object-cover transition-transform group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-slate-900 dark:text-slate-100">
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">Fotoğrafa tıklayınca büyür.</div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Öncesi fotoğraf yok.</div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveFinding(null)}
                  className="rounded-md border border-slate-400 dark:border-slate-600 px-4 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800"
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
                className="absolute -top-10 right-0 rounded-md border border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 hover:bg-white hover:dark:bg-slate-900"
              >
                ✕ Kapat
              </button>

              <img
                src={previewUrl}
                alt="preview"
                className="max-h-[80vh] w-full rounded-xl border border-slate-300 dark:border-slate-700 object-contain bg-slate-100 dark:bg-slate-950"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {singleFindingModal}
      </div>
    </div>
  )
}
