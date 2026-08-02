import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SunLogo from './SunLogo'
import { LayoutDashboard, Radio, ExternalLink, LogOut, User } from 'lucide-react'

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const isLive = location.pathname.startsWith('/dashboard/live')

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Left: Sun Logo + ILMLA Exam Wordmark */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <SunLogo className="h-7 w-7 text-[#FABB00]" />
              <span className="text-lg font-bold tracking-tight text-slate-900">
                ILMLA <span className="text-[#FABB00]">Exam</span>
              </span>
            </Link>

            {/* Nav Tabs */}
            {user && (
              <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold border border-slate-300">
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    !isLive
                      ? 'bg-white text-slate-900 font-bold border border-slate-300 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-slate-600" />
                  Imtihonlar
                </Link>
                <Link
                  to="/dashboard/live"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    isLive
                      ? 'bg-white text-slate-900 font-bold border border-slate-300 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Radio className="h-3.5 w-3.5 text-emerald-600" />
                  Jonli Monitoring
                </Link>
              </nav>
            )}
          </div>

          {/* Right: Role Label + User + Logout */}
          {user && (
            <div className="flex items-center gap-3">
              <Link
                to="/student"
                target="_blank"
                className="hidden text-xs font-semibold sm:inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md hover:bg-slate-200/60 transition-colors"
              >
                <span>Talaba portali</span>
                <ExternalLink className="h-3 w-3 text-slate-500" />
              </Link>

              <div className="flex items-center gap-2 border-l border-slate-300 pl-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold">
                  <User className="h-3.5 w-3.5 text-slate-700" />
                </div>
                <div className="hidden lg:block text-left">
                  <span className="block text-xs font-bold text-slate-900 leading-tight">O'qituvchi</span>
                  <span className="block text-[11px] text-slate-500 truncate max-w-[120px]">{user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="ml-1 cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 shadow-2xs"
                  title="Tizimdan chiqish"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-600" />
                  <span>Chiqish</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Sub-bar for mobile navigation */}
      {user && (
        <div className="md:hidden border-b border-slate-300 bg-white px-4 py-2 flex items-center justify-around text-xs font-semibold">
          <Link
            to="/dashboard"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md ${!isLive ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300' : 'text-slate-600'}`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Imtihonlar
          </Link>
          <Link
            to="/dashboard/live"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md ${isLive ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300' : 'text-slate-600'}`}
          >
            <Radio className="h-3.5 w-3.5 text-emerald-600" />
            Jonli Monitoring
          </Link>
        </div>
      )}

      <main className="animate-fade-in pb-12">
        <Outlet />
      </main>
    </div>
  )
}
