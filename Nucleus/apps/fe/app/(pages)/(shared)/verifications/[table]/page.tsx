import { AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { VerificationFlow } from './components/VerificationFlow'

// Allowed tables for verification flows
const ALLOWED_TABLES = ['content']

type PageProps = {
  params: Promise<{
    table: string
  }>
}

export default async function VerificationsPage({ params }: PageProps) {
  const { table } = await params

  // Validate table parameter
  if (!table || !ALLOWED_TABLES.includes(table)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50/30 p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-slate-900">Invalid Table</h1>
          <p className="mb-6 text-slate-500">
            The table{' '}
            <span className="font-mono text-red-600">&quot;{table || 'undefined'}&quot;</span> is
            not available for verification flows.
          </p>
          <Link
            href="/verifications"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Verifications
          </Link>
        </div>
      </div>
    )
  }

  return <VerificationFlow table={table} />
}
