import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'oklch(0.97 0.005 255)' }}>
      <nav className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md" style={{ borderColor: 'oklch(0.92 0.005 255)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold sm:text-xl" style={{ color: 'oklch(0.20 0.07 255)' }}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}>
              E
            </span>
            Exam Taker
          </Link>
          {user && (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs sm:block" style={{ color: 'oklch(0.55 0.03 255)' }}>
                {user.email}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/80"
                style={{ color: 'oklch(0.45 0.16 255)', backgroundColor: 'oklch(0.90 0.04 255)' }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      <main className="animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
