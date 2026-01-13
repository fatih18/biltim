export default function LyricsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-col overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {children}
    </div>
  )
}
