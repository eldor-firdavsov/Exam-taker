import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import SunLogo from '../components/SunLogo'
import { LogIn, ArrowRight } from 'lucide-react'

export default function StudentHome() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleJoin = (e) => {
    e.preventDefault()
    const cleanPin = pin.replace(/[^a-zA-Z0-9]/g, '').trim()
    if (!cleanPin) {
      setError("Iltimos, imtihon kodini kiriting.")
      return
    }
    navigate(`/exam/${cleanPin}`)
  }

  const formatPinDisplay = (val) => {
    const raw = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (raw.length > 3 && raw.length <= 6) {
      return `${raw.slice(0, 3)} - ${raw.slice(3)}`
    }
    return raw
  }

  const handleChange = (e) => {
    const formatted = formatPinDisplay(e.target.value)
    if (formatted.length <= 9) {
      setPin(formatted)
      setError('')
    }
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

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded px-2.5 py-1 transition-colors flex items-center gap-1"
            >
              <span>O'qituvchi kirishi</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <span className="hidden sm:inline-block rounded bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Talabalar portali
            </span>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-amber-50 border border-amber-200">
                <SunLogo className="h-8 w-8 text-[#FABB00]" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                Imtihonga kirish
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                O'qituvchingiz bergan 6 xonali PIN kodni kiriting
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              {error && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-center text-xs font-medium text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="pin-input" className="sr-only">
                  Imtihon kodi
                </label>
                <input
                  id="pin-input"
                  type="text"
                  value={pin}
                  onChange={handleChange}
                  placeholder="582 - 914"
                  className="w-full rounded border-2 border-slate-200 bg-slate-50 py-3 text-center font-mono text-2xl font-bold tracking-widest text-slate-900 focus:border-[#228BE6] focus:bg-white focus:outline-none placeholder:text-slate-300"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full cursor-pointer rounded bg-[#228BE6] py-3 text-xs font-bold text-white hover:bg-[#1C7ED6] transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <span>Imtihonni boshlash</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
              <div className="grid grid-cols-3 gap-1 text-center text-[11px] text-slate-500">
                <div>
                  <span className="block font-bold text-slate-800">1</span>
                  <span>Kodni kiriting</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800">2</span>
                  <span>Ismni yozing</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800">3</span>
                  <span>Faylni yuklang</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
