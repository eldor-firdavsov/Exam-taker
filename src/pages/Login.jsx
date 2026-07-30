import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: err } =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, fullName)

    setSubmitting(false)

    if (err) {
      setError(err.message)
      return
    }

    if (mode === 'signin') {
      navigate('/dashboard', { replace: true })
    } else {
      setMode('signin')
      setError('Account created! Check your email to confirm, then sign in.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'oklch(0.97 0.005 255)' }}>
      <div className="animate-slide-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white" style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}>
            E
          </span>
          <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.15 0.02 255)' }}>
            {mode === 'signin' ? 'Welcome back' : 'Get started'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            {mode === 'signin'
              ? 'Sign in to manage your exams'
              : 'Create an account to start building exams'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
          style={{ borderColor: 'oklch(0.92 0.005 255)' }}
        >
          <div className="mb-6 flex rounded-xl p-1" style={{ backgroundColor: 'oklch(0.97 0.005 255)' }}>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-white text-black shadow-sm'
                  : ''}`}
              style={mode === 'signin' ? {} : { color: 'oklch(0.55 0.03 255)' }}
              onClick={() => { setMode('signin'); setError('') }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-white text-black shadow-sm'
                  : ''}`}
              style={mode === 'signup' ? {} : { color: 'oklch(0.55 0.03 255)' }}
              onClick={() => { setMode('signup'); setError('') }}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <p
              className={`mb-4 animate-fade-in rounded-xl p-3 text-sm ${
                error.includes('Account created')
                  ? 'text-green-800'
                  : 'text-red-700'
              }`}
              style={{
                backgroundColor: error.includes('Account created')
                  ? 'oklch(0.92 0.05 145)'
                  : 'oklch(0.93 0.05 30)',
              }}
            >
              {error}
            </p>
          )}

          {mode === 'signup' && (
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
                Full Name
              </label>
              <input
                type="text"
                required
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'oklch(0.90 0.01 255)',
                  color: 'oklch(0.15 0.02 255)',
                  '--tw-ring-color': 'oklch(0.73 0.12 255)',
                }}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
              Email
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
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
              style={{
                borderColor: 'oklch(0.90 0.01 255)',
                color: 'oklch(0.15 0.02 255)',
                '--tw-ring-color': 'oklch(0.73 0.12 255)',
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
          >
            {submitting
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>

          {mode === 'signup' && (
            <p className="mt-4 text-xs text-center" style={{ color: 'oklch(0.65 0.02 255)' }}>
              By creating an account, you can manage exams, upload materials, and track student submissions.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
