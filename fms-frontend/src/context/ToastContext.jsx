import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((type, message) => {
    const id = ++idCounter
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => remove(id), 3200)
  }, [remove])

  const toast = {
    success: (msg) => push('success', msg),
    error: (msg) => push('error', msg),
    info: (msg) => push('info', msg),
  }

  const ICONS = { success: CheckCircle2, error: XCircle, info: Info }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={16} />
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
