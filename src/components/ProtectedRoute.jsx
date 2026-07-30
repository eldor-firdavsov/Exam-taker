import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'oklch(0.97 0.005 255)' }}>
        <div className="flex items-center gap-3 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'oklch(0.82 0.08 255)', borderTopColor: 'oklch(0.55 0.18 255)' }} />
          Loading...
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
