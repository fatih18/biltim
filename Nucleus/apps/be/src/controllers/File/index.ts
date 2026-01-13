import path from 'node:path'
import { T_Files } from '@monorepo/db-entities/schemas/default/file'
import { getTenantDB } from '@monorepo/drizzle-manager'
import fileManager from '@monorepo/file-manager'
import { eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

export async function ReadFile(req: ElysiaRequest<{ params: { id: string } }>) {
  return await withChecks({
    operationName: 'Read files',
    req,
    endpoint: async function endpoint(req: ElysiaRequest<{ params: { id: string } }>) {
      const { id } = req.params
      const headers = req.request.headers
      const companyInfo = JSON.parse(headers.get('company_info') || '{}') as CompanyInfo
      const tenantDB = await getTenantDB(companyInfo.schema_name || 'main')

      const fileRecord = await tenantDB.select().from(T_Files).where(eq(T_Files.id, id)).limit(1)
      if (!fileRecord.length) {
        return generateResponse({
          isSuccess: false,
          message: 'File not found',
          errors: 'File not found',
          status: 404,
          request: req,
        })
      }

      const folderPath = fileRecord[0]?.path
      const fileName = fileRecord[0]?.name
      const mimeType = fileRecord[0]?.mime_type ?? 'application/octet-stream'

      if (!folderPath || !fileName) {
        return generateResponse({
          isSuccess: false,
          message: 'File path not found',
          errors: 'File path not found',
          status: 404,
          request: req,
        })
      }

      const filePath = path.join(folderPath, fileName)
      const isInlineCapable =
        mimeType.startsWith('image/') ||
        mimeType.startsWith('video/') ||
        mimeType.startsWith('audio/') ||
        mimeType.startsWith('text/') ||
        mimeType === 'application/pdf'

      const dispositionType = isInlineCapable ? 'inline' : 'attachment'
      const exists = await fileManager.exists(filePath)
      if (!exists) {
        return generateResponse({
          isSuccess: false,
          message: 'Physical file not found',
          errors: 'Physical file not found',
          status: 404,
          request: req,
        })
      }

      const fileInfo = await fileManager.getFileInfo(filePath)
      const range = req.request.headers.get('range')
      const lastModified = new Date(fileInfo.modifiedAt || Date.now()).toUTCString()
      const etag = `"${fileInfo.size}-${fileInfo.modifiedAt}"`
      const cacheHeaders = {
        ETag: etag,
        'Last-Modified': lastModified,
        'Cache-Control': 'public, max-age=86400', // 24 saat cache
      } as const

      const ifNoneMatch = req.request.headers.get('if-none-match')
      if (ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: cacheHeaders,
        })
      }

      const bunFile = Bun.file(filePath)

      // 🔹 RANGE DESTEKLİ
      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
        const start = parseInt(startStr || '0', 10)
        const end = endStr ? parseInt(endStr, 10) : fileInfo.size - 1

        if (start >= fileInfo.size || end >= fileInfo.size || start > end) {
          return new Response('Range not satisfiable', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileInfo.size}`,
              'Content-Type': mimeType,
              ...cacheHeaders,
            },
          })
        }

        const chunkSize = end - start + 1
        const chunkBlob = bunFile.slice(start, end + 1)

        return new Response(chunkBlob, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileInfo.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': mimeType,
            ...cacheHeaders,
          },
        })
      }

      // 🔹 NORMAL TAM DOSYA
      const asciiFallbackName = fileName
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .replace(/_{2,}/g, '_')
        .slice(0, 200)
      const encodedUtf8Name = encodeURIComponent(fileName)
      const contentDisposition = `${dispositionType}; filename="${asciiFallbackName}"; filename*=UTF-8''${encodedUtf8Name}`

      return new Response(bunFile, {
        status: 200,
        headers: {
          'Content-Length': fileInfo.size.toString(),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Content-Disposition': contentDisposition,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          ...cacheHeaders,
        },
      })
    },
  })
}
