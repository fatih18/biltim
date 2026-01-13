export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 w-screen h-screen z-[100]">{children}</div>
}
