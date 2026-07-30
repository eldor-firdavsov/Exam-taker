import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let toastId = 0

const TYPE_STYLES = {
  success: {
    bg: 'oklch(0.52 0.15 160)',
    icon: '\u2713',
  },
  error: {
    bg: 'oklch(0.55 0.17 30)',
    icon: '\u2717',
  },
  info: {
    bg: 'oklch(0.55 0.18 255)',
    icon: '\u2139',
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => {
          const style = TYPE_STYLES[t.type] || TYPE_STYLES.info
          return (
            <div
              key={t.id}
              className="animate-slide-up pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg"
              style={{ backgroundColor: style.bg }}
            >
              <span className="text-base leading-none">{style.icon}</span>
              {t.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
