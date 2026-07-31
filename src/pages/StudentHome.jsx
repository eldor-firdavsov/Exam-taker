import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

  // Format code display (e.g. 582 - 914)
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
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm">
              E
            </span>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Exam Taker
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Talabalar portali
          </span>
        </div>
      </header>

      {/* Main Student PIN Join Hero */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-10 shadow-xl shadow-slate-200/50">
            <div className="text-center mb-8">
              <span className="inline-block rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 mb-3">
                Talabalar portali
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Imtihonga kirish
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                O'qituvchingiz bergan 6 xonali kodni kiriting
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-5">
              {error && (
                <div className="animate-fade-in rounded-2xl bg-red-50 p-3.5 text-center text-xs font-medium text-red-600 border border-red-100">
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
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/60 py-4 text-center font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-blue-950 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 placeholder:text-slate-300"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                Imtihonni boshlash &rarr;
              </button>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-6 text-center">
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                <div className="p-2">
                  <span className="block font-bold text-slate-700 text-sm mb-0.5">1</span>
                  <span>Kodni kiriting</span>
                </div>
                <div className="p-2">
                  <span className="block font-bold text-slate-700 text-sm mb-0.5">2</span>
                  <span>Ismni yozing</span>
                </div>
                <div className="p-2">
                  <span className="block font-bold text-slate-700 text-sm mb-0.5">3</span>
                  <span>Javobni yuklang</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
