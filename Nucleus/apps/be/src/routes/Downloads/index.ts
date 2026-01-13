import { createHash } from 'node:crypto'
import path from 'node:path'
import type { App } from '@/server'

// STORAGE_DIR: localde apps/be/storage, Docker'da /app/storage olacak şekilde cwd tabanlı hesaplanır
const STORAGE_DIR = path.resolve(process.cwd(), 'storage')

/**
 * Static file downloads route
 * Serves files from storage/downloads directory
 */
export function DownloadsRoute(app: App) {
  return app.group('/api/downloads', (app) => {
    // Desktop agent downloads
    app.get('/desktop-agent/:filename', async ({ params, set }) => {
      const { filename } = params

      // Security: only allow specific filenames
      const allowedFiles = [
        'desktop-agent-macos-arm64',
        'desktop-agent-macos-x64',
        'desktop-agent-linux-x64',
        'desktop-agent-windows-x64.exe',
        'desktop-agent-macos.command',
        'desktop-agent-macos.zip',
        'desktop-agent-linux.sh',
        'desktop-agent-windows.bat',
      ]

      if (!allowedFiles.includes(filename)) {
        set.status = 404
        return { error: 'File not found' }
      }

      const filePath = path.join(STORAGE_DIR, 'downloads/desktop-agent', filename)
      const file = Bun.file(filePath)

      if (!(await file.exists())) {
        set.status = 404
        return {
          error: 'File not found',
          message: "Desktop agent has not been built yet. Run 'bun run build:desktop:dist' first.",
        }
      }

      const stats = await file.stat()
      const isWindows = filename.endsWith('.exe')
      const isZip = filename.endsWith('.zip')
      const mimeType = isWindows
        ? 'application/x-msdownload'
        : isZip
          ? 'application/zip'
          : 'application/octet-stream'

      // Content-Disposition for download
      const contentDisposition = `attachment; filename="${filename}"`

      return new Response(file, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': stats.size.toString(),
          'Content-Disposition': contentDisposition,
          'Cache-Control': 'public, max-age=3600', // 1 hour cache
          'Access-Control-Allow-Origin': '*',
        },
      })
    })

    // List available downloads
    app.get('/desktop-agent', async ({ set }) => {
      const downloadDir = path.join(STORAGE_DIR, 'downloads/desktop-agent')

      try {
        const files = await Array.fromAsync(
          new Bun.Glob('*').scan({ cwd: downloadDir, onlyFiles: true })
        )

        const fileInfos = await Promise.all(
          files.map(async (filename) => {
            const filePath = path.join(downloadDir, filename)
            const file = Bun.file(filePath)
            const stats = await file.stat()

            // Calculate MD5 hash for version comparison
            const buffer = await file.arrayBuffer()
            const hash = createHash('md5').update(Buffer.from(buffer)).digest('hex')

            return {
              filename,
              size: stats.size,
              sizeHuman: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
              hash, // MD5 hash for update checking
              downloadUrl: `/api/downloads/desktop-agent/${filename}`,
            }
          })
        )

        return {
          success: true,
          files: fileInfos,
        }
      } catch {
        set.status = 404
        return {
          success: false,
          error: 'No downloads available',
          message: "Desktop agent has not been built yet. Run 'bun run build:desktop:dist' first.",
        }
      }
    })

    return app
  })
}
