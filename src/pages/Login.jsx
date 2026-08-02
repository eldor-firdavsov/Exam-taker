import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SunLogo from '../components/SunLogo'
import { LogIn, ArrowRight } from 'lucide-react'

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
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <SunLogo className="h-7 w-7 text-[#FABB00]" />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              ILMLA <span className="text-[#FABB00]">Exam</span>
            </span>
          </Link>

          <span className="rounded bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            O'qituvchilar bo'limi
          </span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#228BE6] hover:underline"
            >
              &larr; Talabalar sahifasiga qaytish
            </Link>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-amber-50 border border-amber-200">
                <SunLogo className="h-7 w-7 text-[#FABB00]" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                Tizimga kirish
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                O'qituvchilar uchun imtihonlarni boshqarish portali
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-center text-xs font-medium text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Elektron pochta (Email)
                </label>
                <input
                  type="email"
                  required
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="oqituvchi@maktab.uz"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Parol
                </label>
                <input
                  type="password"
                  required
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolingizni kiriting"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer rounded bg-[#228BE6] py-2.5 text-xs font-bold text-white hover:bg-[#1C7ED6] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{submitting ? 'Kirish tekshirilmoqda...' : 'Kirish'}</span>
              </button>

              <div className="mt-4 rounded bg-slate-50 p-3 text-center border border-slate-100">
                <p className="text-[11px] text-slate-500">
                  Kirish huquqiga ega bo'lmasangiz, maktab administratsiyasiga murojaat qining.
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
