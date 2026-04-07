import Link from 'next/link'
import { LayoutDashboard, Plus, TrendingUp, Settings, LogOut, Database } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#fafafa] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#27272a] bg-[#0a0a0b] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#27272a]">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">IPO Admin</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#71717a] uppercase tracking-wider px-3 mb-3">
              Management
            </p>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#a1a1aa] hover:text-white hover:bg-[#18181b] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/ipos/new"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#a1a1aa] hover:text-white hover:bg-[#18181b] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New IPO
            </Link>
            <Link
              href="/admin/gmp"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#a1a1aa] hover:text-white hover:bg-[#18181b] transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              GMP Updates
            </Link>
          </div>

          <div className="mt-8 space-y-1">
            <p className="text-xs font-medium text-[#71717a] uppercase tracking-wider px-3 mb-3">
              Settings
            </p>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#a1a1aa] hover:text-white hover:bg-[#18181b] transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a]">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#a1a1aa] hover:text-white hover:bg-[#18181b] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Back to Site
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
