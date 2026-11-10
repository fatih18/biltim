import { describe, expect, it } from 'bun:test'
import {
  type DownloadIo,
  REVOKE_DELAY_MS,
  type SaveEnv,
  downloadFile,
  filenameFromDisposition,
  queryString,
  saveBlob,
} from './index'

describe('filenameFromDisposition', () => {
  it('reads a quoted and an unquoted file name', () => {
    expect(filenameFromDisposition('attachment; filename="5S-Denetim-Raporu-Haddehane-2026-11-03.xlsx"', 'x.xlsx')).toBe(
      '5S-Denetim-Raporu-Haddehane-2026-11-03.xlsx'
    )
    expect(filenameFromDisposition('attachment; filename=rapor.xlsx', 'x.xlsx')).toBe('rapor.xlsx')
  })

  it('falls back when the header is missing or names no file', () => {
    expect(filenameFromDisposition(null, 'x.xlsx')).toBe('x.xlsx')
    expect(filenameFromDisposition(undefined, 'x.xlsx')).toBe('x.xlsx')
    expect(filenameFromDisposition('attachment', 'x.xlsx')).toBe('x.xlsx')
  })
})

describe('queryString', () => {
  it('keeps the parameters that have a value', () => {
    expect(queryString({ audit_id: 'a-1', year: '' })).toBe('?audit_id=a-1')
  })

  it('is empty when nothing is set', () => {
    expect(queryString({})).toBe('')
    expect(queryString({ year: '' })).toBe('')
  })
})

type Saved = { blob: Blob; filename: string }

/** A download whose request is answered with `answer`, recording what was asked and what was saved. */
function setup(answer: () => Promise<Response>) {
  const asked: string[] = []
  const saved: Saved[] = []
  const io: DownloadIo = {
    fetcher: async (url) => {
      asked.push(url)
      return answer()
    },
    save: (blob, filename) => {
      saved.push({ blob, filename })
    },
  }
  return { io, asked, saved }
}

const attachment = (name: string) => ({ 'Content-Disposition': `attachment; filename="${name}"` })

describe('downloadFile', () => {
  it('asks for the path with its parameters and saves the file under the name the server gave', async () => {
    const { io, asked, saved } = setup(async () => new Response('xlsx-bytes', { headers: attachment('rapor-2026.xlsx') }))
    const result = await downloadFile('/reports/location-form.xlsx', { audit_id: 'a-1', year: '' }, 'x.xlsx', io)
    expect(result).toEqual({ ok: true, filename: 'rapor-2026.xlsx' })
    expect(asked).toEqual(['/reports/location-form.xlsx?audit_id=a-1'])
    expect(saved).toHaveLength(1)
    expect(saved[0]?.filename).toBe('rapor-2026.xlsx')
    expect(await saved[0]?.blob.text()).toBe('xlsx-bytes')
  })

  it('falls back to its own file name when the server names none', async () => {
    const { io } = setup(async () => new Response('x'))
    expect(await downloadFile('/reports/dashboard.xlsx', {}, 'rapor.xlsx', io)).toEqual({ ok: true, filename: 'rapor.xlsx' })
  })

  it('answers status 0 when there is no answer at all', async () => {
    const { io, saved } = setup(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await downloadFile('/reports/dashboard.xlsx', {}, 'rapor.xlsx', io)).toEqual({ ok: false, status: 0, message: '' })
    expect(saved).toHaveLength(0)
  })

  it('answers status 0 when the connection drops while the body is being read, and saves nothing', async () => {
    const dropped = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('connection reset'))
      },
    })
    const { io, saved } = setup(async () => new Response(dropped, { headers: attachment('rapor.xlsx') }))
    expect(await downloadFile('/reports/dashboard.xlsx', {}, 'rapor.xlsx', io)).toEqual({ ok: false, status: 0, message: '' })
    expect(saved).toHaveLength(0)
  })

  it('answers status 0 when saving itself fails, instead of throwing at the caller', async () => {
    const io: DownloadIo = {
      fetcher: async () => new Response('x'),
      save: () => {
        throw new Error('no document')
      },
    }
    expect(await downloadFile('/reports/dashboard.xlsx', {}, 'rapor.xlsx', io)).toEqual({ ok: false, status: 0, message: '' })
  })

  it('carries a refusal\'s status and the server\'s own sentence', async () => {
    const { io, saved } = setup(async () => Response.json({ success: false, message: 'Denetim bulunamadı.' }, { status: 404 }))
    expect(await downloadFile('/reports/location-form.xlsx', { audit_id: 'a-9' }, 'x.xlsx', io)).toEqual({
      ok: false,
      status: 404,
      message: 'Denetim bulunamadı.',
    })
    expect(saved).toHaveLength(0)
  })

  it('keeps the status of a refusal whose body is not JSON, with no message', async () => {
    const { io } = setup(async () => new Response('<html>Bad Gateway</html>', { status: 502 }))
    expect(await downloadFile('/reports/dashboard.xlsx', {}, 'rapor.xlsx', io)).toEqual({ ok: false, status: 502, message: '' })
  })
})

describe('saveBlob', () => {
  /** Records the order of everything the browser is asked to do. */
  function browser() {
    const log: string[] = []
    const tasks: Array<{ run: () => void; delayMs: number }> = []
    const link = {
      href: '',
      download: '',
      click: () => log.push(`click ${link.download} ${link.href}`),
      remove: () => log.push('remove'),
    }
    const env: SaveEnv = {
      createObjectURL: () => {
        log.push('create')
        return 'blob:abc'
      },
      revokeObjectURL: (url) => log.push(`revoke ${url}`),
      createAnchor: () => link,
      later: (run, delayMs) => tasks.push({ run, delayMs }),
    }
    return { env, log, tasks }
  }

  it('clicks a download link carrying the file name', () => {
    const { env, log } = browser()
    saveBlob(new Blob(['x']), 'rapor.xlsx', env)
    expect(log.slice(0, 3)).toEqual(['create', 'click rapor.xlsx blob:abc', 'remove'])
  })

  it('revokes the object URL only after a delay, never at once (iOS Safari cancels the download otherwise)', () => {
    const { env, log, tasks } = browser()
    saveBlob(new Blob(['x']), 'rapor.xlsx', env)
    expect(log.some((line) => line.startsWith('revoke'))).toBe(false)
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.delayMs).toBe(REVOKE_DELAY_MS)
    expect(REVOKE_DELAY_MS).toBe(1000)
    tasks[0]?.run()
    expect(log.at(-1)).toBe('revoke blob:abc')
  })
})
