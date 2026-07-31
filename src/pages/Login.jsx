import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: err } = await signIn(email, password)
    setSubmitting(false)

    if (err) {
      setError(err.message || "Pochta manzili yoki parol xato.")
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: 'oklch(0.97 0.005 255)' }}>
      <div className="mb-6 w-full max-w-sm flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
          style={{ color: 'oklch(0.55 0.18 255)' }}
        >
          &larr; Talabalar sahifasi
        </Link>
        <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'oklch(0.92 0.05 145)', color: 'oklch(0.35 0.10 145)' }}>
          O'qituvchilar bo'limi
        </span>
      </div>

      <div className="animate-slide-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-md" style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}>
            E
          </span>
          <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.15 0.02 255)' }}>
            O'qituvchilar uchun kirish
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            Imtihonlarni boshqarish va talabalar topshiriqlarini baholash
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border bg-white p-6 shadow-md sm:p-8"
          style={{ borderColor: 'oklch(0.92 0.005 255)' }}
        >
          {error && (
            <p
              className="mb-4 animate-fade-in rounded-xl p-3 text-sm text-red-700"
              style={{ backgroundColor: 'oklch(0.93 0.05 30)' }}
            >
              {error}
            </p>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
              Elektron pochta (Email)
            </label>
            <input
              type="email"
              required
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
              style={{
                borderColor: 'oklch(0.90 0.01 255)',
                color: 'oklch(0.15 0.02 255)',
                '--tw-ring-color': 'oklch(0.73 0.12 255)',
              }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="oqituvchi@maktab.uz"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
              Parol
            </label>
            <input
              type="password"
              required
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
              style={{
                borderColor: 'oklch(0.90 0.01 255)',
                color: 'oklch(0.15 0.02 255)',
                '--tw-ring-color': 'oklch(0.73 0.12 255)',
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolingizni kiriting"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-110 shadow-sm disabled:opacity-50"
            style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
          >
            {submitting ? 'Kirish tekshirilmoqda...' : 'Tizimga kirish'}
          </button>

          <div className="mt-6 rounded-xl p-3 text-center" style={{ backgroundColor: 'oklch(0.97 0.005 255)' }}>
            <p className="text-xs" style={{ color: 'oklch(0.60 0.02 255)' }}>
              Yangi o'qituvchilarni ro'yxatdan o'tkazish cheklangan. Kirish huquqini olish uchun administratorga murojaat qiling.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
